// universal-fallback.js - A universal fallback mapper for any device

const BaseMapper = require('../mapper-base');

/**
 * Create a universal fallback mapper that can map any device with minimal capabilities
 * This will be the last resort when all other mappers fail
 */
module.exports = (Mapper, Service, Characteristic, Accessory) => {
  const universalMapper = new BaseMapper(
    // Match any device class with wildcard
    '*',
    // Use the simplest service type
    Service.Switch,
    {
      // Configuration options
      fallbackEnabled: true,
      isFallbackMap: true,
      requiredMatchPercentage: 20, // Ultra low threshold
      name: 'Universal Fallback',
      onService: (service, { device }) => {
        // Add a descriptive name to indicate limited functionality
        service.setCharacteristic(
          Characteristic.Name, 
          `${device.name} (Limited)`
        );
      },
      // Optional category
      category: Accessory.Categories.OTHER
    }
  );

  // Try to map any control capability
  universalMapper.addRequiredCapability('onoff', BaseMapper.CapabilityMapper.onOff());
  
  // Handle all common capability types as optional
  universalMapper.addOptionalCapability('button', {
    characteristics: Characteristic.On,
    get: () => false,
    set: async (value, { device, service, characteristic }) => {
      if (!value) return false;
      // Simulate button press with auto-reset
      setTimeout(() => {
        service.getCharacteristic(characteristic).updateValue(false);
      }, 300);
      return true;
    }
  });
  
  universalMapper.addOptionalCapability('dim', BaseMapper.CapabilityMapper.dim());
  
  universalMapper.addOptionalCapability('measure_temperature', 
    BaseMapper.CapabilityMapper.temperatureSensor());
    
  universalMapper.addOptionalCapability('measure_battery', 
    BaseMapper.CapabilityMapper.batteryLevel());
    
  universalMapper.addOptionalCapability('alarm_motion', 
    BaseMapper.CapabilityMapper.motionSensor());
    
  universalMapper.addOptionalCapability('alarm_contact', 
    BaseMapper.CapabilityMapper.contactSensor());
  
  // Map any toggle capability to a button
  universalMapper.addOptionalCapability('toggle', {
    characteristics: Characteristic.On,
    get: () => false,
    set: async (value, { device, service, characteristic }) => {
      if (!value) return false;
      // Simulate toggle with auto-reset
      setTimeout(() => {
        service.getCharacteristic(characteristic).updateValue(false);
      }, 300);
      return true;
    }
  });
  
  // Map any meter capability
  universalMapper.addOptionalCapability('measure_power', {
    characteristics: Characteristic.On,
    get: (value) => value > 1 // If power > 1W, device is likely on
  });
  
  // Map humidity to humidity characteristic if available
  universalMapper.addOptionalCapability('measure_humidity', {
    characteristics: Characteristic.CurrentRelativeHumidity,
    get: (value) => BaseMapper.ValueConverter.batteryLevel(value)
  });
  
  // Map locked to inverse of on/off
  universalMapper.addOptionalCapability('locked', {
    characteristics: Characteristic.On,
    get: (value) => !value, // Invert because locked=true means "switch off"
    set: (value) => !value  // Invert for same reason
  });
  
  // Return the built mapper
  return universalMapper.build();
};