const EufyCameraController = require('./camera-controller');

class CameraService {
  constructor(log, accessory, device) {
    this.log = log;
    this.accessory = accessory;
    this.device = device;
    
    // Initialize camera controller with device instance
    this.cameraController = new EufyCameraController(log, device);
    
    // Link the camera controller to the accessory
    this.accessory.configureController(this.cameraController.getController());
  }

  // Method to start camera services
  async start() {
    try {
      this.log.info('Starting camera services');
      // Add any initialization logic here
      return true;
    } catch (error) {
      this.log.error('Failed to start camera services:', error);
      throw error;
    }
  }

  // Method to stop camera services
  async stop() {
    try {
      this.log.info('Stopping camera services');
      // Add cleanup logic here
      return true;
    } catch (error) {
      this.log.error('Failed to stop camera services:', error);
      throw error;
    }
  }
}

module.exports = CameraService;
