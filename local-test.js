// Local testing script for HomeKitty logging
const Logger = require('./lib/logger');

// Log message with timestamp for comparing logs
const timestamp = new Date().toISOString();
const sessionId = Math.random().toString(36).substring(2, 8);

Logger.info(`=== Local test session ${sessionId} started at ${timestamp} ===`);
Logger.info('This log should appear in both app.log and the console');
Logger.warn('This warning log should appear in app.log and the console');
Logger.error('This error log should appear in app.log, exceptions.log, and the console');
Logger.debug('This debug log should appear in app.log, debug.log, and the console');

// Log a simulated device event
Logger.logCapability('Test Device', 'onoff', true);
Logger.logCapability('Test Thermostat', 'target_temperature', 22.5);

// Log a simulated HomeKit service operation
Logger.logService('Lightbulb', 'setBrightness', { value: 80, success: true });
Logger.logService('Speaker', 'setVolume', { value: 50, success: true });

// Log a complex object
Logger.info('Configuration object:', {
  version: '3.0.0',
  environment: 'local',
  settings: {
    loggingEnabled: true,
    consoleOutput: true,
    fileOutput: true,
    logLevel: 'debug'
  },
  devices: [
    { id: 'dev1', type: 'light', capabilities: ['onoff', 'dim'] },
    { id: 'dev2', type: 'thermostat', capabilities: ['target_temperature'] }
  ]
});

// Log an error
try {
  throw new Error('Test error for local log validation');
} catch (err) {
  Logger.error('Caught error during local test:', err);
}

Logger.info(`=== Local test session ${sessionId} completed ===`);
console.log(`\nLog test complete - check the log files in the logs directory`);