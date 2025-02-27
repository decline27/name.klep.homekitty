const Logger = require('../logger');

module.exports = (Mapper, Service, Characteristic, Accessory) => {
  // Ensure a name is always available and unique
  const deviceName = 'Eufy Doorbell';
  const deviceId = 'eufy_doorbell';

  // Logging function to track mapping decisions
  const logMappingDecision = (capability, supported, reason = '') => {
    Logger.info(`[Doorbell Mapping] Capability: ${capability} - ${supported ? 'Mapped' : 'Skipped'}${reason ? ` (${reason})` : ''}`);
  };

  return {
    name: deviceName,  // Explicitly set name for mapping
    class: 'doorbell',
    service: Service.Doorbell,
    category: Accessory.Categories.VIDEO_DOORBELL,
    
    // Only map the core doorbell functionality
    required: {
      NTFY_PRESS_DOORBELL: {
        characteristics: Characteristic.ProgrammableSwitchEvent,
        get: (value, { capability, device }) => {
          logMappingDecision(capability, true, 'Core Doorbell Event');
          return Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
        }
      }
    },
    
    // No optional characteristics for Doorbell service
    optional: {},
    
    // Additional services to be dynamically added
    additionalServices: [
      {
        // Battery Service
        when: (device) => device.capabilitiesObj?.measure_battery !== undefined,
        service: Service.BatteryService,
        characteristics: {
          measure_battery: {
            characteristics: Characteristic.BatteryLevel,
            get: (value, { device }) => {
              logMappingDecision('measure_battery', true, 'Battery Service');
              return (value !== null && !isNaN(value)) 
                ? Math.min(Math.max(Number(value), 0), 100) 
                : 50;
            }
          }
        }
      },
      {
        // Motion Sensor Service
        when: (device) => device.capabilitiesObj?.NTFY_MOTION_DETECTION !== undefined,
        service: Service.MotionSensor,
        characteristics: {
          NTFY_MOTION_DETECTION: {
            characteristics: Characteristic.MotionDetected,
            get: (value, { device }) => {
              logMappingDecision('NTFY_MOTION_DETECTION', true, 'Motion Sensor Service');
              return value ? 1 : 0;
            }
          }
        }
      },
      {
        // Camera Service - Hard-coded for Eufy Doorbell
        service: Service.CameraRTPStreamManagement,
        characteristics: {
          onoff: {
            characteristics: [Characteristic.On],
            get: () => true,
            set: value => value
          },
          CMD_START_STREAM: {
            characteristics: [Characteristic.StreamingStatus],
            get: () => 1
          }
        }
      }
    ],
    
    // Customize service setup
    onService: (service, { device }) => {
      // Ensure service has a name and is primary
      service.setPrimaryService(true);
      service.setCharacteristic(Characteristic.Name, deviceName);
      
      // Log the final mapped capabilities
      Logger.info(`[Doorbell Mapping] Mapped core doorbell functionality successfully`);
    }
  };
};
