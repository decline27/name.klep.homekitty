module.exports = (Mapper, Service, Characteristic) => ({
  class: ['thermostat', 'heatpump'],
  service: Service.Thermostat,
  onService: (service, { device }) => {
    // set target temperature props to match Homey's values
    const opts = device.capabilitiesObj?.target_temperature;
    if (!opts) return;
    const props = {};
    if (opts.min) {
      props.minValue = opts.min;
    }
    if (opts.max) {
      props.maxValue = opts.max;
    }
    service.getCharacteristic(Characteristic.TargetTemperature).setProps(props);
  },
  onUpdate: ({ characteristic, oldValue, newValue, service, device, capability }) => {
    const opts = device.capabilitiesObj?.[capability];

    // set correct temperature display unit
    if (opts && 'units' in opts) {
      const unit = opts.units === '°F' ? 'FAHRENHEIT' : 'CELSIUS';
      service.getCharacteristic(Characteristic.TemperatureDisplayUnits).updateValue(Characteristic.TemperatureDisplayUnits[unit]);
    }

    // don't need to fake thermostat mode if the device has the real thing
    if (Mapper.Utils.hasCapability(device, 'thermostat_mode')) return;

    // If the capability 'thermostat_mode' is not used, set to AUTO mode
    service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(Characteristic.CurrentHeatingCoolingState.AUTO);
    service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(Characteristic.TargetHeatingCoolingState.AUTO);
    service.getCharacteristic(Characteristic.TargetHeatingCoolingState).setProps({
      validValues: [Characteristic.TargetHeatingCoolingState.AUTO],
      maxValue: Characteristic.TargetHeatingCoolingState.AUTO,
      minValue: Characteristic.TargetHeatingCoolingState.AUTO
    });
  },
  required: {
    target_temperature: {
      characteristics: Characteristic.TargetTemperature,
      get: (value) => typeof value === 'number' ? value : 0,  // Return 0 for null/undefined
      set: (value) => value
    },
    measure_temperature: {
      characteristics: Characteristic.CurrentTemperature,
      get: (value) => typeof value === 'number' ? value : 0  // Return 0 for null/undefined
    }
  },
  optional: {
    thermostat_mode: {
      characteristics: [
        Characteristic.CurrentHeatingCoolingState,
        Characteristic.TargetHeatingCoolingState
      ],
      get: (value, { characteristic }) => {
        // Default to AUTO if undefined
        if (value === undefined) {
          return Characteristic.CurrentHeatingCoolingState.AUTO;
        }
        switch (value) {
          case 'heat': return Characteristic.CurrentHeatingCoolingState.HEAT;
          case 'cool': return Characteristic.CurrentHeatingCoolingState.COOL;
          case 'auto': return Characteristic.CurrentHeatingCoolingState.AUTO;
          default: return Characteristic.CurrentHeatingCoolingState.OFF;
        }
      },
      set: (value) => {
        switch (value) {
          case Characteristic.TargetHeatingCoolingState.HEAT: return 'heat';
          case Characteristic.TargetHeatingCoolingState.COOL: return 'cool';
          case Characteristic.TargetHeatingCoolingState.AUTO: return 'auto';
          default: return 'off';
        }
      }
    },
    measure_humidity: {
      characteristics: Characteristic.CurrentRelativeHumidity,
      get: (value) => typeof value === 'number' ? value : 0  // Return 0 for null/undefined
    }
  }
});
