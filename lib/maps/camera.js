module.exports = (Mapper, Service, Characteristic) => ({
  class: 'camera',
  service: Service.CameraRTPStreamManagement,
  onService: (service, { device }) => {
    service.getCharacteristic(Characteristic.Name).setValue(device.name);
    service.getCharacteristic(Characteristic.StreamingStatus).setValue(0);
  },
  required: {
    onoff: {
      characteristics: Characteristic.StreamingEnabled,
      ...Mapper.Accessors.Boolean
    },
    motion: {
      characteristics: Characteristic.MotionDetected,
      ...Mapper.Accessors.Boolean
    },
    status: {
      characteristics: Characteristic.StreamingStatus,
      ...Mapper.Accessors.Number
    }
  },
  optional: {
    night_vision: {
      characteristics: Characteristic.NightVision,
      ...Mapper.Accessors.Boolean
    },
    recording: {
      characteristics: Characteristic.CameraOperatingMode,
      get: value => value ? Characteristic.CameraOperatingMode.STREAMING_AND_RECORDING : Characteristic.CameraOperatingMode.STREAMING,
      set: value => value === Characteristic.CameraOperatingMode.STREAMING_AND_RECORDING
    },
    battery_level: Mapper.Characteristics.BatteryLevel,
    charging: Mapper.Characteristics.ChargingState,
    motion_detection_sensitivity: {
      characteristics: Characteristic.MotionDetectionSensitivity,
      ...Mapper.Accessors.Number
    }
  }
});
