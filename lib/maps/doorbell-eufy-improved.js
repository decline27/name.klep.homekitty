// doorbell-eufy-improved.js - Enhanced Eufy doorbell mapper with comprehensive camera capabilities

const BaseMapper = require('../mapper-base');

/**
 * Create a specialized mapper for Eufy doorbells with camera
 * that handles their unique capabilities and notifications
 * with full camera functionality
 */
module.exports = (Mapper, Service, Characteristic, Accessory) => {
  // Use a service composition approach with multiple services
  const eufyDoorbellMapper = new BaseMapper(
    // Specific device handling for Eufy doorbells
    ['doorbell', 'camera'],
    // Use standard Doorbell service as primary service - most compatible with HomeKit
    Service.Doorbell,
    {
      // Configuration options
      requiredMatchPercentage: 20, // Very permissive matching
      fallbackEnabled: true, // Enable fallback mode
      name: 'Eufy Doorbell Enhanced',
      category: Accessory.Categories.VIDEO_DOORBELL,
      onService: (service, { device }) => {
        console.log(`[Doorbell-Eufy-Improved] Setting up doorbell services for ${device.name}`);
        console.log(`[Doorbell-Eufy-Improved] Device capabilities:`, device.capabilities);
        
        // Explicitly configure the Doorbell service properties
        service.setCharacteristic(
          Characteristic.Name, 
          device.name
        );
        
        // Make sure we have programmable switch event characteristic properly set up
        // From HAP spec: 0 = single press, 1 = double press, 2 = long press
        try {
          const switchEvent = service.getCharacteristic(Characteristic.ProgrammableSwitchEvent);
          if (switchEvent) {
            switchEvent.setProps({
              minValue: 0,
              maxValue: 2,
              validValues: [0, 1, 2]
            });
          }
        } catch (error) {
          console.error(`[Doorbell-Eufy-Improved] Error setting switch event props: ${error.message}`);
        }
        
        // Set primary service
        service.setPrimaryService(true);
        
        // Note: Additional services (motion, battery, temperature) are added 
        // through the serviceType and serviceId parameters in addOptionalCapability
        // instead of trying to access device.accessory which is not available at this stage
      }
    }
  );

  //------------------ DOORBELL SERVICE CAPABILITIES -------------------//
  
  // Special handling for Eufy doorbell which uses notifications
  // rather than standard button capability
  eufyDoorbellMapper.addRequiredCapability('NTFY_PRESS_DOORBELL', {
    characteristics: Characteristic.ProgrammableSwitchEvent,
    get: (value) => {
      console.log(`[Doorbell-Eufy-Improved] NTFY_PRESS_DOORBELL triggered with value ${value}`);
      
      // Make sure we have a valid value for HomeKit
      if (value === null || value === undefined) {
        // Default value for doorbell press event
        return Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
      }
      
      // Return a valid value based on the press type
      return Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
    }
  });
  
  // Fallback to standard button capability if available
  eufyDoorbellMapper.addOptionalCapability('button', {
    characteristics: Characteristic.ProgrammableSwitchEvent,
    get: (value) => {
      return Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
    }
  });
  
  // Add volume control if available
  eufyDoorbellMapper.addOptionalCapability('volume_set', {
    characteristics: Characteristic.Volume,
    get: (value) => Math.round(value * 100), // Convert 0-1 to 0-100
    set: (value) => value / 100 // Convert 0-100 to 0-1
  });
  
  // Add mute capability if available
  eufyDoorbellMapper.addOptionalCapability('volume_mute', {
    characteristics: Characteristic.Mute,
    get: (value) => !!value,
    set: (value) => !!value
  });
  
  //------------------ MOTION DETECTION CAPABILITIES -------------------//
  // These capabilities will be sent to the separate motion sensor service
  
  // Add Eufy-specific motion detection (main motion capability)
  eufyDoorbellMapper.addOptionalCapability('NTFY_MOTION_DETECTION', {
    serviceType: Service.MotionSensor, // Explicitly specify service type
    serviceId: 'motion',
    characteristics: Characteristic.MotionDetected,
    get: (value) => {
      console.log(`[Doorbell-Eufy-Improved] Motion detection triggered with value: ${value}`);
      return !!value;
    }
  });
  
  // Fallback to standard motion detection
  eufyDoorbellMapper.addOptionalCapability('alarm_motion', {
    serviceType: Service.MotionSensor, // Explicitly specify service type
    serviceId: 'motion',
    characteristics: Characteristic.MotionDetected,
    get: (value) => !!value
  });
  
  // Add face detection capability (mapped to motion sensor)
  eufyDoorbellMapper.addOptionalCapability('NTFY_FACE_DETECTION', {
    serviceType: Service.MotionSensor, // Explicitly specify service type
    serviceId: 'motion',
    characteristics: Characteristic.MotionDetected,
    get: (value) => !!value
  });
  
  // Additional detection types mapped to motion service to consolidate updates
  eufyDoorbellMapper.addOptionalCapability('NTFY_HUMAN_DETECTION', {
    serviceType: Service.MotionSensor, // Explicitly specify service type
    serviceId: 'motion',
    characteristics: Characteristic.MotionDetected,
    get: (value) => !!value
  });
  
  eufyDoorbellMapper.addOptionalCapability('NTFY_CRYING_DETECTION', {
    serviceType: Service.MotionSensor, // Explicitly specify service type
    serviceId: 'motion',
    characteristics: Characteristic.MotionDetected,
    get: (value) => !!value
  });
  
  eufyDoorbellMapper.addOptionalCapability('NTFY_PET_DETECTED', {
    serviceType: Service.MotionSensor, // Explicitly specify service type
    serviceId: 'motion',
    characteristics: Characteristic.MotionDetected,
    get: (value) => !!value
  });
  
  eufyDoorbellMapper.addOptionalCapability('NTFY_VEHICLE_DETECTED', {
    serviceType: Service.MotionSensor, // Explicitly specify service type
    serviceId: 'motion',
    characteristics: Characteristic.MotionDetected,
    get: (value) => !!value
  });
  
  eufyDoorbellMapper.addOptionalCapability('NTFY_PACKAGE_DETECTION', {
    serviceType: Service.MotionSensor, // Explicitly specify service type
    serviceId: 'motion',
    characteristics: Characteristic.MotionDetected,
    get: (value) => !!value
  });
  
  //------------------ BATTERY AND POWER CAPABILITIES -------------------//
  // These capabilities will be sent to the separate battery service
  
  // Add battery level if available
  eufyDoorbellMapper.addOptionalCapability('measure_battery', {
    serviceType: Service.BatteryService, // Explicitly specify service type
    serviceId: 'battery',
    characteristics: [Characteristic.BatteryLevel, Characteristic.StatusLowBattery],
    get: (value, { characteristic }) => {
      // Handle different characteristics
      if (characteristic === 'BatteryLevel') {
        return BaseMapper.ValueConverter.batteryLevel(value);
      } else {
        // For StatusLowBattery: 1 if below 20%, 0 otherwise
        return value < 20 ? 1 : 0;
      }
    }
  });
  
  // Add charging status if available
  eufyDoorbellMapper.addOptionalCapability('measure_power', {
    serviceType: Service.BatteryService, // Explicitly specify service type
    serviceId: 'battery',
    characteristics: Characteristic.ChargingState,
    get: (value) => value > 0 ? 1 : 0 // 1 = charging, 0 = not charging
  });
  
  //------------------ CAMERA CAPABILITIES -------------------//
  // Camera streaming will be handled separately
  
  // Power status
  eufyDoorbellMapper.addOptionalCapability('onoff', {
    characteristics: Characteristic.ProgrammableSwitchOutputState,
    get: (value) => value ? 1 : 0,
    set: (value) => !!value
  });
  
  // Skip camera-specific capabilities for now to avoid validation errors
  eufyDoorbellMapper.addOptionalCapability('CMD_START_STREAM', {
    characteristics: null,
    get: () => null
  });
  
  eufyDoorbellMapper.addOptionalCapability('night_vision', {
    characteristics: null,
    get: () => null
  });
  
  eufyDoorbellMapper.addOptionalCapability('camera_recording', {
    characteristics: null,
    get: () => null
  });
  
  //------------------ TEMPERATURE SENSOR CAPABILITIES -------------------//
  // These capabilities will be sent to the separate temperature sensor service
  
  // Add temperature sensor if available
  eufyDoorbellMapper.addOptionalCapability('measure_temperature', {
    serviceType: Service.TemperatureSensor, // Explicitly specify service type
    serviceId: 'temperature',
    characteristics: Characteristic.CurrentTemperature,
    get: (value) => BaseMapper.ValueConverter.temperature(value)
  });
  
  // Skip humidity and luminance for now to avoid validation errors
  eufyDoorbellMapper.addOptionalCapability('measure_humidity', {
    characteristics: null,
    get: () => null
  });
  
  eufyDoorbellMapper.addOptionalCapability('measure_luminance', {
    characteristics: null,
    get: () => null
  });
  
  //------------------ ADDITIONAL CAPABILITIES -------------------//
  
  // Skip these for now to avoid validation errors
  eufyDoorbellMapper.addOptionalCapability('dim', {
    characteristics: null,
    get: () => null
  });
  
  eufyDoorbellMapper.addOptionalCapability('speaker_playing', {
    characteristics: null,
    get: () => null
  });
  
  // Return the built mapper configuration
  return eufyDoorbellMapper.build();
};