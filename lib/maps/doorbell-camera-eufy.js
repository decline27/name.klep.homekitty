const CameraService = require('../camera/camera-service');

module.exports = (Mapper, Service, Characteristic, Accessory) => {
  // Create camera service when the mapper is initialized
  const cameraService = new CameraService(Mapper.log, Mapper.accessory, Mapper.device);

  return {
    class: ['doorbell'],
    service: Service.Doorbell,
    category: Accessory.Categories.VIDEO_DOORBELL,
    required: {
      NTFY_PRESS_DOORBELL: {
        characteristics: Characteristic.ProgrammableSwitchEvent,
        get: () => Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS
      }
    },
    optional: {
      // Camera operating mode characteristics
      onoff: {
        service: Service.CameraOperatingMode,
        characteristics: [
          Characteristic.ManuallyDisabled,
          Characteristic.HomeKitCameraActive,
          Characteristic.NightVision,
          Characteristic.PeriodicSnapshotsActive,
          Characteristic.EventSnapshotsActive,
          Characteristic.CameraOperatingModeIndicator
        ],
        get: (value, { characteristic }) => {
          if (characteristic === 'ManuallyDisabled') {
            return !value;  // Invert since ManuallyDisabled is opposite of onoff
          }
          if (characteristic === 'NightVision') {
            return true;  // Camera supports night vision
          }
          if (characteristic === 'PeriodicSnapshotsActive' || characteristic === 'EventSnapshotsActive') {
            return true;  // Enable snapshots
          }
          if (characteristic === 'CameraOperatingModeIndicator') {
            return true;  // Show camera status LED
          }
          return value;  // HomeKitCameraActive matches onoff directly
        },
        set: (value, { characteristic }) => {
          return characteristic === 'ManuallyDisabled' ? !value : value;
        }
      }
    },
    // Initialize camera service when the device is ready
    init: async () => {
      try {
        await cameraService.start();
      } catch (error) {
        Mapper.log.error('Failed to initialize camera service:', error);
      }
    },
    // Clean up camera service when the device is removed
    destroy: async () => {
      try {
        await cameraService.stop();
      } catch (error) {
        Mapper.log.error('Failed to stop camera service:', error);
      }
    }
  };
};
