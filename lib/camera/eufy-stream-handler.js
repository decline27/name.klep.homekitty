const { StreamRequestTypes } = require('hap-nodejs');
const ffmpeg = require('fluent-ffmpeg');
const EufyCameraClient = require('./eufy-camera-client');

class EufyStreamHandler {
  constructor(log, device) {
    this.log = log;
    this.device = device;
    this.activeStreams = new Map();
    this.cameraClient = new EufyCameraClient(log, device);
  }

  // Start a new stream session
  async startStream(sessionId, request) {
    this.log.info(`Starting stream session ${sessionId}`);
    
    try {
      const streamConfig = this._prepareStreamConfig(request);
      
      // Get RTSP URL from Eufy camera
      const rtspUrl = await this.cameraClient.getRtspUrl();
      
      // Set up FFmpeg command for transcoding
      const ffmpegCommand = this._createFfmpegCommand(rtspUrl, streamConfig);
      
      // Store the stream session
      this.activeStreams.set(sessionId, {
        command: ffmpegCommand,
        config: streamConfig,
        startTime: Date.now()
      });
      
      // Start streaming
      ffmpegCommand.run();
      
      return true;
    } catch (error) {
      this.log.error(`Failed to start stream: ${error.message}`);
      throw error;
    }
  }

  // Stop a stream session
  async stopStream(sessionId) {
    this.log.info(`Stopping stream session ${sessionId}`);
    
    const session = this.activeStreams.get(sessionId);
    if (session) {
      try {
        session.command.kill('SIGKILL');
        this.activeStreams.delete(sessionId);
        return true;
      } catch (error) {
        this.log.error(`Failed to stop stream: ${error.message}`);
        throw error;
      }
    }
    return false;
  }

  // Get a snapshot from the camera
  async getSnapshot() {
    return this.cameraClient.getSnapshot();
  }

  // Prepare stream configuration based on HomeKit request
  _prepareStreamConfig(request) {
    const videoConfig = request.video;
    const audioConfig = request.audio;
    
    return {
      video: {
        width: videoConfig.width,
        height: videoConfig.height,
        fps: videoConfig.fps,
        profile: videoConfig.profile,
        level: videoConfig.level
      },
      audio: audioConfig ? {
        codec: audioConfig.codec,
        channels: audioConfig.channels,
        samplerate: audioConfig.samplerate,
        bitrate: audioConfig.bitrate
      } : null
    };
  }

  // Create FFmpeg command for transcoding
  _createFfmpegCommand(rtspUrl, config) {
    const command = ffmpeg(rtspUrl)
      .inputOptions([
        '-re',
        '-rtsp_transport tcp',
        '-preset ultrafast'
      ])
      .outputOptions([
        '-tune zerolatency',
        '-profile:v high'
      ]);

    // Video configuration
    command
      .size(`${config.video.width}x${config.video.height}`)
      .fps(config.video.fps)
      .videoCodec('libx264')
      .videoBitrate('2000k');

    // Audio configuration if enabled
    if (config.audio) {
      command
        .audioCodec('libfdk_aac')
        .audioBitrate('128k')
        .audioChannels(config.audio.channels)
        .audioFrequency(config.audio.samplerate * 1000);
    } else {
      command.noAudio();
    }

    return command;
  }
}

module.exports = EufyStreamHandler;
