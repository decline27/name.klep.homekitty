const { CameraController } = require('hap-nodejs');
const EufyStreamHandler = require('./eufy-stream-handler');

class EufyCameraController {
  constructor(log, device) {
    this.log = log;
    this.device = device;
    this.streamHandler = new EufyStreamHandler(log, device);
    
    // Default streaming configurations
    this.streamConfig = {
      video: {
        codec: {
          profiles: [0, 1, 2], // Baseline, Main, High
          levels: [0, 1, 2], // 3.1, 3.2, 4.0
        },
        resolutions: [
          [320, 180, 30], // width, height, fps
          [320, 240, 15],
          [480, 270, 30],
          [480, 360, 30],
          [640, 360, 30],
          [640, 480, 30],
          [1280, 720, 30],
          [1920, 1080, 30],
        ],
      },
      audio: {
        codecs: [
          {
            type: "AAC-eld",
            samplerate: 16,
            channels: 1,
          },
        ],
      },
    };

    // Create HAP camera controller
    this.controller = new CameraController({
      cameraStreamCount: 2, // number of simultaneous streams supported
      delegate: {
        handleSnapshotRequest: this.handleSnapshotRequest.bind(this),
        handleStreamRequest: this.handleStreamRequest.bind(this),
      },
      streamingOptions: this.streamConfig
    });
  }

  // Handle snapshot requests from HomeKit
  async handleSnapshotRequest(request) {
    this.log.info('Snapshot requested:', request);
    try {
      const snapshot = await this.streamHandler.getSnapshot();
      return snapshot;
    } catch (error) {
      this.log.error('Failed to handle snapshot request:', error);
      throw error;
    }
  }

  // Handle streaming requests from HomeKit
  async handleStreamRequest(request) {
    this.log.info('Stream requested:', request);
    try {
      const sessionId = request.sessionID;
      
      switch (request.type) {
        case 'start':
          return this.streamHandler.startStream(sessionId, request);
        case 'reconfigure':
          // Handle stream reconfiguration
          await this.streamHandler.stopStream(sessionId);
          return this.streamHandler.startStream(sessionId, request);
        case 'stop':
          return this.streamHandler.stopStream(sessionId);
        default:
          throw new Error(`Unsupported stream request type: ${request.type}`);
      }
    } catch (error) {
      this.log.error('Failed to handle stream request:', error);
      throw error;
    }
  }

  // Get the camera controller instance
  getController() {
    return this.controller;
  }
}

module.exports = EufyCameraController;
