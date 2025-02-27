// light-improved.js - Improved light mapper using the new base mapper

const BaseMapper = require('../mapper-base');

/**
 * Create an improved light mapper with better capabilities handling
 */
module.exports = (Mapper, Service, Characteristic, Accessory) => {
  const lightMapper = new BaseMapper(
    // Device classes
    ['light', 'socket'],
    // HomeKit service
    Service.Lightbulb,
    {
      // Configuration options
      group: true,
      requiredMatchPercentage: 50,
      name: 'Improved Light',
      category: Accessory.Categories.LIGHTBULB
    }
  );

  // Add required on/off capability
  lightMapper.addRequiredCapability('onoff', BaseMapper.CapabilityMapper.onOff());
  
  // Add optional dim capability
  lightMapper.addOptionalCapability('dim', BaseMapper.CapabilityMapper.dim());
  
  // Add optional light color capabilities
  lightMapper.addOptionalCapability('light_hue', {
    characteristics: Characteristic.Hue,
    get: (value) => value * 360, // Convert 0-1 to 0-360
    set: (value) => value / 360  // Convert 0-360 to 0-1
  });
  
  lightMapper.addOptionalCapability('light_saturation', {
    characteristics: Characteristic.Saturation,
    get: (value) => value * 100, // Convert 0-1 to 0-100
    set: (value) => value / 100  // Convert 0-100 to 0-1
  });
  
  // Add light temperature if available
  lightMapper.addOptionalCapability('light_temperature', {
    characteristics: Characteristic.ColorTemperature,
    get: (value) => {
      // Convert percentage to mired (inverse microreciprocal degrees)
      // 0% = warm (high mired value ~500)
      // 100% = cool (low mired value ~140)
      return Math.round(BaseMapper.ValueConverter.mapRange(value, 0, 1, 500, 140));
    },
    set: (value) => {
      // Convert mired to percentage
      return BaseMapper.ValueConverter.mapRange(value, 500, 140, 0, 1);
    }
  });
  
  // Add optional light mode for lights with specific modes
  lightMapper.addOptionalCapability('light_mode', {
    characteristics: Characteristic.ColorTemperature,
    get: (value) => {
      // Simple mapping: 'temperature' mode = 200, 'color' mode = 300
      return value === 'temperature' ? 200 : 300;
    },
    set: (value) => {
      // Set mode based on temperature value
      return value < 250 ? 'temperature' : 'color';
    }
  });
  
  // Add support for power measurement
  lightMapper.addOptionalCapability('measure_power', {
    characteristics: Characteristic.On,
    get: (value) => value > 1 // Light is on if power consumption > 1W
  });
  
  // Return the built mapper configuration
  return lightMapper.build();
};