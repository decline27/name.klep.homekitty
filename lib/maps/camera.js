module.exports = (Mapper, Service, Characteristic) => {
  return {
    class: 'camera',
    service: Service.CameraRTPStreamManagement,
    required: {
      onoff: {
        characteristics: [Characteristic.On],
        get: value => value === true,
        set: value => value
      },
      alarm_motion: {
        characteristics: [Characteristic.MotionDetected],
        get: value => value === true
      }
    },
    optional: {
      measure_battery: {
        characteristics: [Characteristic.BatteryLevel, Characteristic.StatusLowBattery],
        get: (value, { characteristic }) => {
          if (characteristic === 'BatteryLevel') return value;
          return value <= 20 ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
        }
      },
      CMD_START_STREAM: {
        characteristics: [Characteristic.StreamingStatus],
        get: value => value === true ? 1 : 0
      }
    },
    triggers: {
      NTFY_MOTION_DETECTION: {
        characteristics: [Characteristic.MotionDetected],
        get: value => value === true
      },
      NTFY_FACE_DETECTION: {
        characteristics: [Characteristic.MotionDetected],
        get: value => value === true
      }
    }
  };
};