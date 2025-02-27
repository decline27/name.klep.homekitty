const { createMapping, MapperUtils } = require('../mapper-helper');

module.exports = (Mapper, Service, Characteristic) => {
  return createMapping({
    // Match any sensor-type device class
    deviceClass: ['sensor', 'other'],
    service: Service.TemperatureSensor,
    // Set lower match threshold for sensors
    fallbackEnabled: true,
    requiredMatchPercentage: 30,
    // Minimal requirement for temperature sensor mapping
    required: {
      // Try to map any measurement capability
      measure_temperature: {
        characteristics: Characteristic.CurrentTemperature,
        get: (value) => MapperUtils.getSafeValue('temperature', value)
      }
    },
    // Optional capabilities for enhanced sensor functionality
    optional: {
      // Humidity mapping
      measure_humidity: {
        characteristics: Characteristic.CurrentRelativeHumidity,
        get: (value) => MapperUtils.getSafeValue('batteryLevel', value)
      },
      // Battery level mapping
      measure_battery: {
        characteristics: Characteristic.BatteryLevel,
        get: (value) => MapperUtils.getSafeValue('batteryLevel', value)
      },
      // Status active mapping
      alarm_battery: {
        characteristics: Characteristic.StatusLowBattery,
        get: (value) => value ? 1 : 0
      },
      // Light level mapping
      measure_luminance: {
        characteristics: Characteristic.LightLevel,
        get: (value) => value
      },
      // CO2 level mapped to air quality
      measure_co2: {
        characteristics: Characteristic.AirQuality,
        get: (value) => {
          // Map CO2 levels to HomeKit air quality levels
          // 1 = Excellent, 2 = Good, 3 = Fair, 4 = Inferior, 5 = Poor
          if (value < 600) return 1;
          if (value < 800) return 2;
          if (value < 1000) return 3;
          if (value < 1500) return 4;
          return 5;
        }
      },
      // Pressure mapping to a custom characteristic
      measure_pressure: {
        characteristics: Characteristic.CurrentTemperature, // Reuse as placeholder
        get: (value) => value / 10 // Scale to reasonable range
      }
    },
    // Setup the service when created
    onService: (service, { device }) => {
      // Add a descriptive name
      service.setCharacteristic(
        Characteristic.Name, 
        `${device.name} Sensor`
      );
    }
  });
};