const { createMapping, MapperUtils } = require('../mapper-helper');

module.exports = (Mapper, Service, Characteristic) => {
  return createMapping({
    class: ['thermostat', 'heatpump'],
    service: Service.Thermostat,
    required: {
      measure_temperature: {
        characteristics: Characteristic.CurrentTemperature,
        get: (value, { device }) => {
          return MapperUtils.getSafeValue('temperature', value, {
            defaultValue: 20  // Default to 20°C
          });
        }
      },
      target_temperature: {
        characteristics: Characteristic.TargetTemperature,
        get: (value, { device }) => {
          return MapperUtils.getSafeValue('temperature', value, {
            defaultValue: 22  // Default to 22°C
          });
        }
      }
    },
    optional: {
      measure_temperature_outside: {
        characteristics: Characteristic.CurrentTemperature,
        get: (value, { device }) => {
          return MapperUtils.getSafeValue('temperature', value, {
            defaultValue: 15  // Default to 15°C for outside temperature
          });
        }
      },
      heating_state: {
        characteristics: Characteristic.TargetHeatingCoolingState,
        get: (value, { device }) => {
          return MapperUtils.getSafeValue('heatingCoolingState', value);
        }
      }
    }
  });
};
