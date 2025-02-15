module.exports = (Mapper, Service, Characteristic, Accessory) => {
  const {
    SINGLE_PRESS,
    DOUBLE_PRESS,
    LONG_PRESS,
  } = Characteristic.ProgrammableSwitchEvent;

  return {
    name: 'Video Doorbell',
    class: ['doorbell', 'videodoorbell'],
    virtualClass: ['video-doorbell', 'camera-doorbell', 'eufy-doorbell'],
    category: Accessory.Categories.VIDEO_DOORBELL,

    // Required capabilities
    required: {
      'NTFY_PRESS_DOORBELL': {
        characteristic: Characteristic.ProgrammableSwitchEvent,
        get: (value) => SINGLE_PRESS, // Momentary event trigger
        set: (value) => null // Events are read-only
      },
      'camera_stream': {
        characteristic: Characteristic.StreamingStatus,
        get: (value) => ({
          codec: 'H264',
          active: value ? 1 : 0
        })
      }
    },

    // Optional capabilities
    optional: {
      'CMD_DOORBELL_QUICK_RESPONSE': {
        characteristic: Characteristic.On,
        get: value => value === null ? false : Boolean(value),
        set: value => value
      },
      'measure_temperature': {
        characteristic: Characteristic.CurrentTemperature,
        get: value => {
          if (value === null || isNaN(value)) return 0;
          return Math.max(-270, Math.min(100, value));
        }
      },
      'NTFY_MOTION_DETECTION': {
        characteristic: Characteristic.MotionDetected,
        get: value => value === null ? false : Boolean(value)
      },
      'NTFY_FACE_DETECTION': {
        characteristic: Characteristic.Active,
        get: value => value === null ? false : Boolean(value)
      },
      'NTFY_PET_DETECTED': {
        characteristic: Characteristic.OccupancyDetected,
        get: value => value === null ? 0 : (value ? 1 : 0)
      },
      'NTFY_VEHICLE_DETECTED': {
        characteristic: Characteristic.OccupancyDetected,
        get: value => value === null ? 0 : (value ? 1 : 0)
      },
      'measure_battery': {
        characteristic: [
          Characteristic.BatteryLevel,
          Characteristic.ChargingState,
          Characteristic.StatusLowBattery
        ],
        get: (value, { characteristic }) => {
          const level = value === null ? 0 : Math.max(0, Math.min(100, value));
          switch (characteristic) {
            case 'BatteryLevel':
              return level;
            case 'ChargingState':
              return Characteristic.ChargingState.NOT_CHARGING;
            case 'StatusLowBattery':
              return level <= 20 ? 
                Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : 
                Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
            default:
              return null;
          }
        }
      }
    },

    // Service configuration
    services: {
      doorbell: {
        service: Service.Doorbell,
        primary: true,
        characteristics: ['NTFY_PRESS_DOORBELL'],
        onService: (service, { device }) => {
          // Ensure service has a name even if device.name is undefined
          service.setCharacteristic(
            Characteristic.Name,
            device?.name || 'Video Doorbell'
          );
        }
      },
      operatingMode: {
        service: Service.CameraOperatingMode,
        characteristics: ['onoff'],
        onService: (service, { device }) => {
          service.setCharacteristic(
            Characteristic.Name,
            `${device?.name || 'Video Doorbell'} Camera`
          );
        }
      },
      quickResponse: {
        service: Service.Switch,
        name: "Quick Response",
        characteristics: ['CMD_DOORBELL_QUICK_RESPONSE']
      },
      temperature: {
        service: Service.TemperatureSensor,
        characteristics: ['measure_temperature']
      },
      motion: {
        service: Service.MotionSensor,
        name: "Motion Sensor",
        characteristics: ['NTFY_MOTION_DETECTION']
      },
      faceDetection: {
        service: Service.CameraEventRecordingManagement,
        name: "Face Detection",
        characteristics: ['NTFY_FACE_DETECTION']
      },
      petDetection: {
        service: Service.OccupancySensor,
        name: "Pet Detection",
        characteristics: ['NTFY_PET_DETECTED']
      },
      vehicleDetection: {
        service: Service.OccupancySensor,
        name: "Vehicle Detection",
        characteristics: ['NTFY_VEHICLE_DETECTED']
      },
      battery: {
        service: Service.Battery,
        characteristics: ['measure_battery']
      }
    },

    init: async ({ accessory, device }) => {
      try {
        // Set the accessory name if device name is undefined
        if (!device?.name) {
          accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Name, 'Video Doorbell');
        }

        // Import required modules
        const crypto = require('crypto');
        
        // Camera streaming configuration
        const cameraControl = new Service.CameraRTSPStreamManagement();
        
        // Configure video stream parameters
        cameraControl.setCharacteristic(Characteristic.VideoCodec, 'H264');
        cameraControl.setCharacteristic(Characteristic.AudioCodec, 'AAC');
        cameraControl.setCharacteristic(Characteristic.SupportedVideoStreamConfiguration, {
          codec: 'H264',
          parameters: {
            profiles: ['baseline'],
            levels: ['3.1'],
            packetizationModes: ['non-interleaved']
          },
          resolutions: [
            { width: 1280, height: 720, framerate: 30 },
            { width: 1920, height: 1080, framerate: 30 }
          ]
        });

        // Add SRTP security parameters
        const srtpConfig = crypto.randomBytes(16);
        cameraControl.setCharacteristic(Characteristic.SetupEndpoints, {
          video: {
            port: 51000,
            srtpKey: srtpConfig.slice(0, 16),
            srtpSalt: srtpConfig.slice(16, 30)
          }
        });

        // Add mandatory motion service
        const motionService = accessory.addService(Service.MotionSensor, 'Doorbell Motion');
        motionService.getCharacteristic(Characteristic.MotionDetected)
          .on('get', callback => callback(null, device.getCapabilityValue('motion')));

        // Add services to accessory
        accessory.addService(cameraControl);
        accessory.addService(motionService);

        // Configure stream handlers
        cameraControl.configureController({
          delegate: {
            async prepareStream(request) {
              try {
                // Validate supported codec
                if (!request.video.codec.startsWith('H264')) {
                  throw new Error(`Unsupported video codec: ${request.video.codec}`);
                }
                
                const stream = await device.initializeStream({
                  width: request.video.width,
                  height: request.video.height,
                  fps: request.video.fps,
                  videoCodec: request.video.codec,
                  audioCodec: request.audio?.codec,
                });

                return {
                  video: {
                    port: stream.videoPort,
                    ssrc: stream.videoSsrc,
                    srtpKey: stream.videoKey,
                    srtpSalt: stream.videoSalt,
                  },
                  audio: stream.audioEnabled ? {
                    port: stream.audioPort,
                    ssrc: stream.audioSsrc,
                    srtpKey: stream.audioKey,
                    srtpSalt: stream.audioSalt,
                  } : undefined,
                };
              } catch (error) {
                Mapper.error('Failed to prepare stream:', error);
                throw error;
              }
            },
            async handleStreamRequest(request) {
              try {
                await device.startStreaming(request);
              } catch (error) {
                Mapper.error('Failed to handle stream request:', error);
              }
            },
            async stopStream() {
              try {
                await device.stopStreaming();
              } catch (error) {
                Mapper.error('Failed to stop stream:', error);
              }
            },
          },
          streamingOptions: streamConfig,
        });

        // Configure the controller
        accessory.configureController(controller);

        // Log initialization
        Mapper.log('Initialized video doorbell:', {
          deviceId: device?.id || 'unknown',
          deviceName: device?.name || 'Video Doorbell',
          capabilities: device?.capabilities || [],
          hasCamera: !!controller
        });

        return true;
      } catch (error) {
        Mapper.error('Failed to initialize video doorbell:', error);
        return false;
      }
    }
  };
};
