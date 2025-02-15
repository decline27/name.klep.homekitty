module.exports = (Mapper, Service, Characteristic) => ({
  class: ['spa'],
  service: Service.Thermostat,
  onService: (service, { device }) => {
    // set target temperature props for spa temperatures (higher max temp)
    const opts = device.capabilitiesObj?.target_temperature;
    if (!opts) return;
    const props = {
      minValue: Math.max(Math.min(opts.min ?? 10, 10), 5),  // Minimum 5°C, default 10°C
      maxValue: Math.min(opts.max ?? 40, 40),               // Maximum 40°C for spa
      minStep: opts.step ?? 0.5                             // Default to 0.5°C steps
    };
    service.getCharacteristic(Characteristic.TargetTemperature).setProps(props);
    
    // Also set current temperature range
    service.getCharacteristic(Characteristic.CurrentTemperature).setProps({
      minValue: props.minValue,
      maxValue: props.maxValue
    });
  },
  required: {
    target_temperature: {
      characteristics: Characteristic.TargetTemperature,
      get: (value) => {
        return Math.min(Math.max(value, 10), 40);  // Clamp between 10-40°C
      },
      set: (value) => value
    },
    measure_temperature: {
      characteristics: Characteristic.CurrentTemperature,
      get: (value) => {
        return Math.min(Math.max(value, 10), 40);  // Clamp between 10-40°C
      }
    }
  },
  optional: {
    onoff: {
      characteristics: [
        Characteristic.CurrentHeatingCoolingState,
        Characteristic.TargetHeatingCoolingState
      ],
      get: (value, { characteristic }) => {
        const state = value ? 
          Characteristic.CurrentHeatingCoolingState.HEAT : 
          Characteristic.CurrentHeatingCoolingState.OFF;
        return state;
      },
      set: (value) => {
        return value !== Characteristic.TargetHeatingCoolingState.OFF;
      }
    }
  }
});
