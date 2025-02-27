// camera-improved.js - Enhanced camera mapper using the new BaseMapper system

const BaseMapper = require('../mapper-base');

/**
 * Create an improved camera mapper with better capability handling
 * and support for both standard and vendor-specific capabilities
 */
module.exports = (Mapper, Service, Characteristic, Accessory) => {
  const cameraMapper = new BaseMapper(
    // Device classes
    ['camera'],
    // HomeKit service - using MotionSensor service as primary to prevent characteristic warnings
    Service.MotionSensor,
    {
      // Configuration options
      requiredMatchPercentage: 30, // Very permissive for cameras
      name: 'Improved Camera',
      category: Accessory.Categories.CAMERA,
      // Setup service when created
      onService: (service, { device }) => {
        // Set camera name
        service.setCharacteristic(
          Characteristic.Name, 
          `${device.name} Camera`
        );
        
        // Note: CameraRTPStreamManagement service should be added through
        // the serviceType and serviceId parameters in addOptionalCapability
        // instead of trying to access device.accessory which is not available at this stage
        console.log(`[Camera-Improved] Setting up camera services for ${device.name}`);
      }
    }
  );

  // Add primary camera capabilities
  cameraMapper.addRequiredCapability('onoff', {
    characteristics: Characteristic.On,
    get: (value) => !!value,
    set: (value) => !!value
  });
  
  // Add all motion capabilities to motion sensor service (primary service)
  
  // Standard motion detection
  cameraMapper.addOptionalCapability('alarm_motion', {
    characteristics: Characteristic.MotionDetected,
    get: (value) => !!value
  });
  
  // Eufy-specific motion detection
  cameraMapper.addOptionalCapability('NTFY_MOTION_DETECTION', {
    characteristics: Characteristic.MotionDetected,
    get: (value) => !!value
  });
  
  // Eufy face detection as motion trigger
  cameraMapper.addOptionalCapability('NTFY_FACE_DETECTION', {
    characteristics: Characteristic.MotionDetected,
    get: (value) => !!value
  });
  
  // Add battery level to motion sensor service
  cameraMapper.addOptionalCapability('measure_battery', {
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
  
  // Add status tampered if available
  cameraMapper.addOptionalCapability('alarm_tamper', {
    characteristics: Characteristic.StatusTampered,
    get: (value) => value ? 1 : 0
  });
  
  // The following capabilities will be handled by the CameraRTPStreamManagement service
  // which is added in the onService handler
  
  // Add stream control capability with proper service type
  cameraMapper.addOptionalCapability('CMD_START_STREAM', {
    serviceType: Service.CameraRTPStreamManagement, // Specify service type
    serviceId: 'camera',
    characteristics: Characteristic.StreamingStatus, // Use a valid characteristic
    get: () => null,      // Will be handled by camera controller later
    set: () => null
  });
  
  // Add night vision capability with proper service type
  cameraMapper.addOptionalCapability('night_vision', {
    serviceType: Service.CameraRTPStreamManagement, // Specify service type
    serviceId: 'camera',
    characteristics: Characteristic.NightVision,
    get: (value) => !!value,
    set: (value) => !!value
  });
  
  // Add microphone capability with proper service type
  cameraMapper.addOptionalCapability('microphone', {
    serviceType: Service.CameraRTPStreamManagement, // Specify service type
    serviceId: 'camera',
    characteristics: Characteristic.Mute,
    get: (value) => !value, // Invert: true = unmuted, false = muted in HomeKit
    set: (value) => !value  // Invert: true = unmute, false = mute in HomeKit
  });
  
  // Add speaker capability with proper service type
  cameraMapper.addOptionalCapability('speaker', {
    serviceType: Service.CameraRTPStreamManagement, // Specify service type
    serviceId: 'camera',
    characteristics: Characteristic.Volume,
    get: (value) => value * 100, // Scale 0-1 to 0-100
    set: (value) => value / 100  // Scale 0-100 to 0-1
  });
  
  // Return the built mapper configuration
  return cameraMapper.build();
};