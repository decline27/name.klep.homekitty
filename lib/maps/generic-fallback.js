const { createMapping, MapperUtils } = require('../mapper-helper');

module.exports = (Mapper, Service, Characteristic) => {
  return createMapping({
    // This is a fallback map that can match any device class
    deviceClass: ['*'],
    service: Service.Switch,
    // Enable fallback mode with very low match percentage
    fallbackEnabled: true,
    isFallbackMap: true,
    requiredMatchPercentage: 20, // Even lower threshold
    // Try to map any common capabilities - now more lenient with measure_power
    required: {
      // Allow mapping of button OR measure_power (adding measure_power)
      button: {
        characteristics: Characteristic.On,
        get: Mapper.Fixed.False,
        set: async (value, { device, service, characteristic }) => {
          if (!value) return false;
          // Simulate button press
          setTimeout(() => {
            service.getCharacteristic(characteristic).updateValue(false);
          }, 300);
          return true;
        }
      },
      // Add measure_power as an alternative required capability
      measure_power: {
        characteristics: Characteristic.On,
        get: (value) => value > 1 // If power > 1W, device is likely on
      }
    },
    // Try to map any of these capabilities if available
    optional: {
      // Basic on/off support
      onoff: {
        characteristics: Characteristic.On,
        get: (value) => !!value,
        set: (value) => !!value
      },
      // Map toggle capability
      toggle: {
        characteristics: Characteristic.On,
        get: Mapper.Fixed.False,
        set: async (value, { device, service, characteristic }) => {
          if (!value) return false;
          setTimeout(() => {
            service.getCharacteristic(characteristic).updateValue(false);
          }, 300);
          return true;
        }
      },
      // Basic dim support
      dim: {
        characteristics: Characteristic.Brightness,
        get: (value) => value * 100,
        set: (value) => value / 100
      },
      // Basic temperature sensing
      measure_temperature: {
        characteristics: Characteristic.CurrentTemperature,
        get: (value) => MapperUtils.getSafeValue('temperature', value)
      },
      // Map any sensor data to a simplified representation
      measure_humidity: {
        characteristics: Characteristic.CurrentRelativeHumidity,
        get: (value) => MapperUtils.getSafeValue('batteryLevel', value)
      },
      measure_luminance: {
        characteristics: Characteristic.LightLevel,
        get: (value) => value
      },
      alarm_motion: {
        characteristics: Characteristic.MotionDetected,
        get: (value) => !!value
      },
      alarm_contact: {
        characteristics: Characteristic.ContactSensorState,
        get: (value) => value ? 1 : 0
      },
      alarm_water: {
        characteristics: Characteristic.LeakDetected,
        get: (value) => value ? 1 : 0
      },
      // Battery support
      measure_battery: {
        characteristics: Characteristic.BatteryLevel,
        get: (value) => MapperUtils.getSafeValue('batteryLevel', value)
      }
    },
    // Setup the service when created
    onService: (service, { device }) => {
      // Add a name based on the device name
      service.setCharacteristic(
        Characteristic.Name, 
        `${device.name} (Limited)`
      );
      
      // Check device class and capabilities to determine if it's a power meter
      const isPowerMeter = device.capabilities?.includes('measure_power') && 
                           (!device.capabilities?.includes('onoff') && 
                            !device.capabilities?.includes('button'));
      
      if (isPowerMeter) {
        service.setCharacteristic(
          Characteristic.Name, 
          `${device.name} (Power Meter)`
        );
      }
    }
  });
};