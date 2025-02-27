const BaseMapper = require('../mapper-base');

/**
 * Map remote control devices to HomeKit
 * This handles remote devices with no specific capabilities
 */
module.exports = (Mapper, Service, Characteristic, Accessory) => {
  const remoteControlMapper = new BaseMapper(
    // Match remote device class
    'remote',
    // Use television service as it's the best match for remote control devices
    Service.Television,
    {
      // Configuration options
      name: 'Remote Control',
      // Use low match percentage for empty capability devices
      requiredMatchPercentage: 15,
      // Set to fallback to ensure it only applies to devices with no other suitable mappers
      fallbackEnabled: true,
      onService: (service, { device }) => {
        // Add a descriptive name
        service.setCharacteristic(
          Characteristic.Name, 
          `${device.name} Remote`
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
  remoteControlMapper.addOptionalCapability('onoff', {
    characteristics: Characteristic.Active,
    get: (value) => value ? 1 : 0,
    set: (value) => !!value
  });
  
  // Add remote key handling if available
  remoteControlMapper.addOptionalCapability('remote_key', {
    characteristics: Characteristic.RemoteKey,
    set: (value) => {
      // HomeKit remote key values:
      // 0: REWIND
      // 1: FAST_FORWARD
      // 2: NEXT_TRACK
      // 3: PREVIOUS_TRACK
      // 4: ARROW_UP
      // 5: ARROW_DOWN
      // 6: ARROW_LEFT
      // 7: ARROW_RIGHT
      // 8: SELECT
      // 9: BACK
      // 10: EXIT
      // 11: PLAY_PAUSE
      // 12: INFORMATION
      
      // Just pass through the value
      return value;
    }
  });
  
  // Return the built mapper
  return remoteControlMapper.build();
};