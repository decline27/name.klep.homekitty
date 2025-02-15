module.exports = (Mapper, Service, Characteristic, Accessory) => ({
  class: ['doorbell'],
  service: Service.MotionSensor,
  category: Accessory.Categories.SENSOR,
  required: {
    alarm_motion: {
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
    }
  }
});
