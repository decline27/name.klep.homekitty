// Comprehensive test script for the logger
const Logger = require('./lib/logger');

// Test basic logging functionality
Logger.info('Test info message');
Logger.warn('Test warning message');
Logger.error('Test error message');
Logger.debug('Test debug message');

// Test object logging
Logger.info('Test object logging:', { name: 'HomeKitty', version: '3.0.0', settings: { enabled: true, port: 8080 } });

// Test error logging
try {
  throw new Error('Test error for logging');
} catch (err) {
  Logger.error('Caught an error:', err);
}

// Test capability logging
Logger.logCapability('Living Room Lamp', 'onoff', true);
Logger.logCapability('Kitchen Thermostat', 'target_temperature', 22.5);

// Test service logging
Logger.logService('Thermostat', 'getTargetTemperature', { value: 22.5, callback: 'function called' });
Logger.logService('Lock', 'setLockState', { value: 'SECURED', success: true });

Logger.info('Logger test complete - check log files in the logs directory');
