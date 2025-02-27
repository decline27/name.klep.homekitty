const BaseMapper = require('../mapper-base');

/**
 * Map devices with no capabilities to HomeKit as a basic service
 * This is a last resort mapper for devices that don't match any other pattern
 */
module.exports = (Mapper, Service, Characteristic, Accessory) => {
  const emptyDeviceMapper = new BaseMapper(
    // Match any device class
    ['*'],
    // Use switch service as it's the simplest
    Service.Switch,
    {
      // Configuration options
      name: 'Empty Device',
      // Use ultra low match percentage for empty capability devices
      requiredMatchPercentage: 10,
      // Set to fallback to ensure it only applies to devices with no other suitable mappers
      fallbackEnabled: true,
      isFallbackMap: true,
      onService: (service, { device }) => {
        // Add a descriptive name indicating limited functionality
        service.setCharacteristic(
          Characteristic.Name, 
          `${device.name} (Limited View)`
        );
        
        // Set the initial state to off
        service.setCharacteristic(
          Characteristic.On,
          false
        );
      },
      // Use generic accessory category
      category: Accessory.Categories.OTHER
    }
  );

  // No required capabilities - this mapper is specifically for devices with no capabilities
  // or devices that don't match any other mapper
  
  // Add minimal required capability with default values
  // This acts as a placeholder that will never be used
  emptyDeviceMapper.addRequiredCapability('_empty', {
    characteristics: Characteristic.On,
    get: () => false,
    set: () => false
  });
  
  // Return the built mapper
  return emptyDeviceMapper.build();
};