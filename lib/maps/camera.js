module.exports = (Mapper, Service, Characteristic) => ({
  class: ['camera'],
  service: Service.Camera,  // Primary service should be Camera
  required: {
    onoff: {
      characteristics: [
        Characteristic.Active,
        Characteristic.StreamingStatus
      ],
      get: (value, { characteristic }) => {
        if (characteristic === 'Active') {
          return value ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
        }
        return value;
      }
    }
  },
  optional: {
    // Camera operating mode
    camera_mode: {
      service: Service.CameraOperatingMode,
      characteristics: [
        Characteristic.ManuallyDisabled,
        Characteristic.HomeKitCameraActive
      ],
      get: (value, { characteristic }) => {
        if (characteristic === 'ManuallyDisabled') {
          return !value;  // Invert since ManuallyDisabled is opposite of onoff
        }
        return value;  // HomeKitCameraActive matches onoff directly
      },
      set: (value, { characteristic }) => {
        return characteristic === 'ManuallyDisabled' ? !value : value;
      }
    },
    // Camera RTP Stream Management
    streaming: {
      service: Service.CameraRTPStreamManagement,
      characteristics: [
        Characteristic.SupportedVideoStreamConfiguration,
        Characteristic.SupportedAudioStreamConfiguration,
        Characteristic.SupportedRTPConfiguration,
        Characteristic.SelectedRTPStreamConfiguration,
        Characteristic.StreamingStatus,
        Characteristic.SetupEndpoints
      ],
      get: (value) => value
    },
    // Floodlight control
    CMD_SET_FLOODLIGHT_MANUAL_SWITCH: {
      service: Service.Lightbulb,  // Proper service for light control
      characteristics: Characteristic.On,
      get: (value) => !!value,
      set: (value) => value
    },
    // Temperature sensor
    measure_temperature: {
      service: Service.TemperatureSensor,
      characteristics: Characteristic.CurrentTemperature,
      get: (value) => typeof value === 'number' ? value : 0
    },
    // Motion detection
    alarm_motion: {
      service: Service.MotionSensor,
      characteristics: [
        Characteristic.MotionDetected,
        Characteristic.StatusActive
      ],
      get: (value, { characteristic }) => {
        if (characteristic === 'StatusActive') {
          return true;  // Motion sensor is active
        }
        return !!value;  // Motion detected state
      },
      triggers: [
        'NTFY_MOTION_DETECTION',
        'NTFY_FACE_DETECTION',
        'NTFY_PET_DETECTED',
        'NTFY_VEHICLE_DETECTED'
      ]
    },
    // Battery monitoring
    measure_battery: {
      service: Service.Battery,
      characteristics: [
        Characteristic.BatteryLevel,
        Characteristic.StatusLowBattery,
        Characteristic.ChargingState
      ],
      get: (value, { characteristic }) => {
        if (characteristic === 'BatteryLevel') {
          return typeof value === 'number' ? Math.min(Math.max(value, 0), 100) : 0;
        }
        if (characteristic === 'ChargingState') {
          return Characteristic.ChargingState.NOT_CHARGEABLE;
        }
        return value < 15;  // StatusLowBattery
      }
    }
  }
});
