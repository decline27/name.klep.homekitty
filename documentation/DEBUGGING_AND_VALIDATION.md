# Debugging and Validation Strategies

## Overview
This document outlines the enhanced debugging, logging, and validation systems implemented in HomeKitty. The implementation provides comprehensive logging, error handling, and diagnostic capabilities for robust troubleshooting and monitoring.

## Advanced Logging System

HomeKitty maintains several structured log files:

1. **app.log** - Main application log with all messages
2. **debug.log** - Detailed debugging information 
3. **warnings.log** - Warning messages that may indicate potential issues
4. **exceptions.log** - Error messages and stack traces
5. **terminal.log** - Complete terminal output when running with the logging script

All logs are stored in the `/logs` directory.

## Running with File Logging

The project includes a dedicated script for running with enhanced file logging:

```bash
./run-with-logging.sh
```

This script:
- Ensures the logs directory exists
- Sets up proper log file paths
- Enables detailed file logging
- Captures both console output and structured logs
- Provides a summary of each log file after execution

## Logger Implementation

HomeKitty provides two logging implementations:

### 1. Basic Logger (`/lib/logger.js`)

The standard Logger class provides:
- Four log levels: INFO, WARN, ERROR, DEBUG
- File and console logging with automatic environment detection
- Structured formatting with timestamps
- Capability and service tracking methods

### 2. Enhanced Logger (`/lib/enhanced-logger.js`)

The EnhancedLogger extends basic logging with:
- JSON-structured log entries
- Automatic log rotation based on file size
- Error object serialization with stack traces
- Configurable log levels and paths
- Sanitization of sensitive information

### Logging Usage Examples

```javascript
// Basic logging
Logger.info('Device connected:', deviceName);
Logger.warn('Connection unstable:', { device: deviceName, reason: 'timeout' });
Logger.error('Failed to process capability:', error);
Logger.debug('Processing capability:', { capability, value, timestamp });

// Special logging methods
Logger.logCapability('Living Room Light', 'onoff', true);
Logger.logService('Thermostat', 'getTargetTemperature', { value: 22.5 });
```

## Error Handling Architecture

HomeKitty implements a robust error handling system:

### 1. Global Error Handling

A global unhandled promise rejection handler catches and processes all unhandled async errors:

```javascript
process.on('unhandledRejection', (reason, promise) => {
  // Special handling for API subscription timeouts
  if (reason?.message?.includes('Failed to subscribe to homey:device:')) {
    Logger.warn('API subscription timeout:', reason.message);
    return;
  }
  
  // For other errors, log them as critical
  Logger.error('Unhandled Promise Rejection:', reason);
});
```

### 2. Capability Observation with Retry Logic

The CapabilityObserver class implements:
- Exponential backoff retry for failed subscriptions
- Shared capability monitoring to reduce subscription overhead
- Automatic recovery from transient errors
- Caching of last known values when subscriptions fail

### 3. Device State Management

The DeviceStateManager provides:
- Reliable state handling with validation
- Automatic recovery from device communication errors
- State caching for offline devices
- Controlled state updates with debouncing

## Debugging Tools and Techniques

### Mapper Debugging

The device-mapper.js now includes enhanced debugging:
- Detailed logging of mapping decisions with percentages
- Service conflict detection and resolution
- Automatic selection of improved mappers over legacy versions
- Capability matching scores and threshold information

### Device Registry Monitoring

The DeviceRegistry tracks:
- Device registration status and history
- Mapping cache with automatic invalidation
- Error patterns and frequency tracking
- Device capability changes and conflicts

### Validation of Values

All characteristic values are validated before being set in HomeKit:
- Type validation
- Range validation (min/max)
- Format validation
- Special handling for temperature limits (e.g., 38°C max for HomeKit)

## Integration Validation

### New Device Validation

Process for validating new device types:
1. Capability analysis and logging
2. Mapper selection verification
3. Characteristic validation
4. Service conflict detection
5. Subscription management validation

### Mapper Validation

Each mapper undergoes validation:
- RequiredMatchPercentage verification
- Service type compatibility checks
- Characteristic property validation
- Capability transformation testing

## Refactoring and Improvement

The system now follows a more modular design with:
- Separation of concerns through specialized components
- BaseMapper system for standardized mapping
- Centralized capability observation and state management
- Enhanced logging with structured data

## Conclusion

These enhanced debugging, logging, and validation systems ensure HomeKitty remains reliable and maintainable while providing powerful diagnostic tools for development and troubleshooting.