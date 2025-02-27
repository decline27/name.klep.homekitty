const BaseMapper = require('../mapper-base');

/**
 * Map empty speaker devices to HomeKit
 * This handles speaker devices with no capabilities
 */
module.exports = (Mapper, Service, Characteristic, Accessory) => {
  const basicSpeakerMapper = new BaseMapper(
    // Match speaker device class
    'speaker',
    // Use television service as it's the best match for media devices
    Service.Television,
    {
      // Configuration options
      name: 'Basic Speaker',
      // Use low match percentage since we're handling empty capability devices
      requiredMatchPercentage: 15,
      // Set to fallback to ensure it only applies to devices with no other suitable mappers
      fallbackEnabled: true,
      onService: (service, { device }) => {
        // Add a descriptive name
        service.setCharacteristic(
          Characteristic.Name, 
          `${device.name} (Basic)`
        );
        
        // Configure as active by default
        service.setCharacteristic(
          Characteristic.Active,
          1
        );
        
        // Configure default settings
        service.setCharacteristic(
          Characteristic.ActiveIdentifier,
          1
        );
        
        // Configure display status
        service.setCharacteristic(
          Characteristic.ConfiguredName,
          device.name
        );
      },
      // Use appropriate accessory category
      category: Accessory.Categories.TELEVISION
    }
  );

  // No required capabilities since we're handling empty capability devices
  // We're relying on the class matching and low required match percentage
  
  // Optional capabilities for enhanced functionality
  basicSpeakerMapper.addOptionalCapability('onoff', {
    characteristics: Characteristic.Active,
    get: (value) => value ? 1 : 0,
    set: (value) => !!value
  });
  
  basicSpeakerMapper.addOptionalCapability('volume_set', {
    characteristics: Characteristic.Volume,
    get: (value) => Math.min(Math.max(value * 100, 0), 100),
    set: (value) => value / 100
  });
  
  basicSpeakerMapper.addOptionalCapability('volume_mute', {
    characteristics: Characteristic.Mute,
    get: (value) => !!value,
    set: (value) => !!value
  });
  
  // Return the built mapper
  return basicSpeakerMapper.build();
};