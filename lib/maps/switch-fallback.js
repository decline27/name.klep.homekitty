const { createMapping, MapperUtils } = require('../mapper-helper');

module.exports = (Mapper, Service, Characteristic) => {
  return createMapping({
    // Match a wide range of device classes that could reasonably be represented as switches
    deviceClass: [
      'button', 'coffeemachine', 'fan', 'heater', 'kettle', 
      'light', 'lock', 'remote', 'socket', 'switch', 'tv', 'vacuum'
    ],
    service: Service.Switch,
    // Enable fallback with lower threshold
    fallbackEnabled: true,
    requiredMatchPercentage: 35,
    // Only need one capability to function minimally
    required: {
      // Any of these capabilities can be mapped to a switch
      onoff: {
        characteristics: Characteristic.On,
        get: (value) => !!value,
        set: (value) => !!value
      }
    },
    // Optional capabilities that enhance the switch functionality
    optional: {
      // Allows power consumption monitoring
      measure_power: {
        characteristics: Characteristic.On, // Reuse existing (no direct mapping)
        get: (value) => value > 1 // If power > 1W, device is likely on
      },
      // Dim capability as a proxy for power level/intensity
      dim: {
        characteristics: Characteristic.Brightness,
        get: (value) => value * 100,
        set: (value) => value / 100
      },
      // Handle button presses
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
      // Handle lock state (converted to switch)
      locked: {
        characteristics: Characteristic.On,
        get: (value) => !value, // Invert because locked=true means "switch off"
        set: (value) => !value  // Invert for same reason
      }
    },
    // Add helpful service configuration
    onService: (service, { device }) => {
      // Label the limited functionality device
      service.setCharacteristic(
        Characteristic.Name, 
        `${device.name} (Switch Mode)`
      );
    }
  });
};