const { createMapping, MapperUtils } = require('../mapper-helper');

module.exports = (Mapper, Service, Characteristic) => {
  return createMapping({
    class: ['sensor', 'other'],
    service: Service.TemperatureSensor,
    required: {
      measure_temperature: {
        characteristics: Characteristic.CurrentTemperature,
        get: (value, { device }) => {
          return MapperUtils.getSafeValue('temperature', value, {
            defaultValue: 20  // Default to 20°C if no value
          });
        }
      }
    },
    optional: {
      measure_humidity: {
        characteristics: Characteristic.CurrentRelativeHumidity,
        get: (value, { device }) => {
          return MapperUtils.getSafeValue('batteryLevel', value, {
            defaultValue: 50  // Default to 50% humidity
          });
        }
      }
    }
  });
};
