const BaseMapper = require('../mapper-base');

/**
 * Map price measurement devices to HomeKit as a sensor
 * This handles devices with price_level and measure_price capabilities
 */
module.exports = (Mapper, Service, Characteristic, Accessory) => {
  const priceSensorMapper = new BaseMapper(
    // Match device classes
    ['other'],
    // Use light sensor as it's one of the simpler sensor types
    Service.LightSensor,
    {
      // Configuration options
      name: 'Price Sensor',
      requiredMatchPercentage: 40,
      onService: (service, { device }) => {
        // Add a descriptive name
        service.setCharacteristic(
          Characteristic.Name, 
          `${device.name} Price Monitor`
        );
      },
      // Use appropriate accessory category
      category: Accessory.Categories.SENSOR
    }
  );

  // Required capabilities - any of these will make the mapper applicable
  priceSensorMapper.addRequiredCapability('measure_price_level', {
    characteristics: Characteristic.CurrentAmbientLightLevel,
    get: (value) => {
      // Map price level to light level (higher price = higher level)
      // Ensure the value is within HomeKit's acceptable range (0.0001-100000)
      return Math.max(Math.min(value * 10 + 0.0001, 100000), 0.0001);
    }
  });
  
  // Alternative required capabilities
  priceSensorMapper.addRequiredCapability('price_level', {
    characteristics: Characteristic.CurrentAmbientLightLevel,
    get: (value) => {
      // Map price level to light level
      return Math.max(Math.min(value * 10 + 0.0001, 100000), 0.0001);
    }
  });
  
  // Optional capabilities
  priceSensorMapper.addOptionalCapability('measure_price_total', {
    // Use same characteristic, but with different logic
    characteristics: Characteristic.CurrentAmbientLightLevel,
    get: (value) => {
      // Only use if no other mapping is active
      // Map total price to light level
      return Math.max(Math.min(value + 0.0001, 100000), 0.0001);
    }
  });
  
  // Return the built mapper
  return priceSensorMapper.build();
};