module.exports = (Mapper, Service, Characteristic) => ({
  class: ['thermostat'],
  service: Service.Thermostat,
  required: {
    target_temperature: {
      characteristics: Characteristic.TargetTemperature,
      get: (value) => {
        return Math.min(Math.max(value, 10), 30);  // Clamp between 10-30°C
      },
      set: (value) => value
    },
    measure_temperature: {
      characteristics: Characteristic.CurrentTemperature,
      get: (value) => {
        return Math.min(Math.max(value, 10), 30);  // Clamp between 10-30°C
      }
    },
    onoff: {
      characteristics: [
        Characteristic.CurrentHeatingCoolingState,
        Characteristic.TargetHeatingCoolingState
      ],
      get: (value, { characteristic, device }) => {
        if (!value) return Characteristic.CurrentHeatingCoolingState.OFF;
        
        // Check mode if available
        const mode = device.capabilitiesObj?.thermostat_mode?.value;
        if (mode === 'heat') return Characteristic.CurrentHeatingCoolingState.HEAT;
        if (mode === 'cool') return Characteristic.CurrentHeatingCoolingState.COOL;
        
        // Default to auto
        return Characteristic.CurrentHeatingCoolingState.AUTO;
      },
      set: (value) => {
        return value !== Characteristic.TargetHeatingCoolingState.OFF;
      }
    }
  },
  optional: {
    measure_humidity: {
      characteristics: Characteristic.CurrentRelativeHumidity,
      get: (value) => {
        return Math.min(Math.max(value, 0), 100);  // Clamp between 0-100%
      }
    },
    thermostat_mode: {
      characteristics: [
        Characteristic.CurrentHeatingCoolingState,
        Characteristic.TargetHeatingCoolingState
      ],
      get: (value, { characteristic }) => {
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
    }
  }
});
