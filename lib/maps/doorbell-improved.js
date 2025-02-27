// doorbell-improved.js - Enhanced doorbell mapper using the new BaseMapper system

const BaseMapper = require('../mapper-base');

/**
 * Create an improved doorbell mapper that provides better integration
 * with HomeKit and support for various doorbell capabilities
 */
module.exports = (Mapper, Service, Characteristic, Accessory) => {
  const doorbellMapper = new BaseMapper(
    // Device classes
    ['doorbell'],
    // HomeKit service
    Service.Doorbell,
    {
      // Configuration options
      requiredMatchPercentage: 40, // More permissive matching
      name: 'Improved Doorbell',
      category: Accessory.Categories.VIDEO_DOORBELL,
      // Set up service when created
      onService: (service, { device }) => {
        // Set doorbell name
        service.setCharacteristic(
          Characteristic.Name, 
          `${device.name} Doorbell`
        );
        // Mark as primary service
        service.setPrimaryService(true);
      }
    }
  );

  // Add primary doorbell button capability
  doorbellMapper.addRequiredCapability('button', {
    characteristics: Characteristic.ProgrammableSwitchEvent,
    get: (value) => {
      // Standard single press event for doorbell
      return Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
    }
  });
  
  // Add alternative Eufy-specific doorbell trigger
  doorbellMapper.addOptionalCapability('NTFY_PRESS_DOORBELL', {
    characteristics: Characteristic.ProgrammableSwitchEvent,
    get: (value) => {
      // Eufy doorbell press event
      return Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
    }
  });
  
  // Add volume control if available
  doorbellMapper.addOptionalCapability('volume_set', {
    characteristics: Characteristic.Volume,
    get: (value) => Math.round(value * 100), // Convert 0-1 to 0-100
    set: (value) => value / 100 // Convert 0-100 to 0-1
  });
  
  // Add mute capability if available
  doorbellMapper.addOptionalCapability('volume_mute', {
    characteristics: Characteristic.Mute,
    get: (value) => !!value,
    set: (value) => !!value
  });
  
  // Add brightness control for doorbell LED/screen if available
  doorbellMapper.addOptionalCapability('dim', {
    characteristics: Characteristic.Brightness,
    get: (value) => BaseMapper.ValueConverter.percentage(value),
    set: (value) => BaseMapper.ValueConverter.percentageReverse(value)
  });
  
  // Add motion detection capability
  doorbellMapper.addOptionalCapability('alarm_motion', {
    characteristics: Characteristic.MotionDetected,
    get: (value) => !!value
  });
  
  // Add Eufy-specific motion detection
  doorbellMapper.addOptionalCapability('NTFY_MOTION_DETECTION', {
    characteristics: Characteristic.MotionDetected,
    get: (value) => !!value
  });
  
  // Add battery level if available
  doorbellMapper.addOptionalCapability('measure_battery', {
    characteristics: [Characteristic.BatteryLevel, Characteristic.StatusLowBattery],
    get: (value, { characteristic }) => {
      // Handle different characteristics from the same capability
      if (characteristic === 'BatteryLevel') {
        return BaseMapper.ValueConverter.batteryLevel(value);
      } else {
        // For StatusLowBattery: 1 if below 20%, 0 otherwise
        return value < 20 ? 1 : 0;
      }
    }
  });
  
  // Return the built mapper configuration
  return doorbellMapper.build();
};