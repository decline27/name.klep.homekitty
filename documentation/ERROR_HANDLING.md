# Error Handling Architecture

## Overview

HomeKitty implements a comprehensive error handling system designed to provide maximum reliability, graceful error recovery, and detailed diagnostics. This document outlines the multi-layered approach to error handling throughout the system.

## Global Error Handling

### Unhandled Promise Rejection Handler

At the application level, a global unhandled promise rejection handler catches and processes unexpected errors:

```javascript
process.on('unhandledRejection', (reason, promise) => {
  // Special handling for known error patterns
  if (reason?.message?.includes('Failed to subscribe to homey:device:')) {
    Logger.warn('API subscription timeout:', reason.message);
    Logger.debug('This is a known issue with device subscriptions');
    return; // Prevent app crash for subscription timeouts
  }
  
  // For other unhandled rejections, log them as critical errors
  Logger.error('Unhandled Promise Rejection:', reason);
});
```

This prevents application crashes from unhandled async errors and provides special handling for known issues.

## Device Subscription Management

### CapabilityObserver

The `CapabilityObserver` class (lib/capability-observer.js) implements robust subscription management:

#### Subscription Retry Logic

```javascript
async createCapabilityInstance(capability, retryCount = 0, maxRetries = 3) {
  try {
    // Create capability instance with error handling
    const instance = this.device.makeCapabilityInstance(capability, value => {
      this.lastValues.set(capability, value);
      this.notifyObservers(capability, value);
    });
    
    this.capabilities.set(capability, instance);
    
    // Log success after retries
    if (retryCount > 0) {
      this.logger(`[SUCCESS] Successfully created capability instance after ${retryCount} retries`);
    }
  } catch (error) {
    // Log the error
    this.logger(`[ERROR] Failed to observe capability ${capability}: ${error.message}`);
    
    if (retryCount < maxRetries) {
      // Calculate exponential backoff delay (capped at maxDelay)
      const delay = Math.min(initialDelay * Math.pow(2, retryCount), maxDelay);
      
      // Log retry attempt
      this.logger(`[RETRY] Retrying capability ${capability} in ${delay}ms`);
      
      // Use a timeout to retry after delay
      setTimeout(() => {
        this.createCapabilityInstance(capability, retryCount + 1, maxRetries);
      }, delay);
    } else {
      // Log final failure and continue with cached values
      this.logger(`[FAILED] Max retries reached for capability ${capability}`);
      this.capabilities.set(capability, null);
    }
  }
}
```

#### Fallback Values and State Preservation

The observer maintains last known values to handle subscription failures:

```javascript
// Get the current value of a capability
getCurrentValue(capability) {
  // Return cached value even when subscription fails
  return this.lastValues.get(capability);
}

// Initialize with device's current values when available
if (this.device.capabilitiesObj?.[capability]?.value !== undefined) {
  this.lastValues.set(capability, this.device.capabilitiesObj[capability].value);
}
```

## State Validation and Management

### DeviceStateManager

The `DeviceStateManager` class (lib/device-state-manager.js) ensures valid state transitions:

#### Value Validation

```javascript
// Register a validator for a capability
registerValidator(capability, validator) {
  if (typeof validator !== 'function') {
    this.logger(`[ERROR] Validator for ${capability} is not a function`);
    return;
  }
  
  this.stateValidators.set(capability, validator);
}

// Validate when setting state
async setState(capability, value, updateDevice = true) {
  try {
    // Validate value if validator exists
    if (this.stateValidators.has(capability)) {
      const validator = this.stateValidators.get(capability);
      try {
        value = validator(value);
      } catch (error) {
        this.logger(`[ERROR] Invalid value for ${capability}: ${error.message}`);
        throw error;
      }
    }
    
    // Update internal state and device
    // ...
  } catch (error) {
    this.logger(`[ERROR] Failed to set state: ${error.message}`);
    throw error;
  }
}
```

#### Update Retry Logic

```javascript
async updateDeviceCapability(capability, value) {
  // Prevent concurrent updates
  if (this.pendingUpdates.has(capability)) {
    try {
      await this.pendingUpdates.get(capability);
    } catch (error) {
      // Ignore errors from previous updates
    }
  }
  
  const updatePromise = (async () => {
    try {
      await this.device.setCapabilityValue(capability, value);
      this.resetErrorCount(capability);
      return value;
    } catch (error) {
      // Record error and attempt recovery if needed
      const count = this.incrementErrorCount(capability);
      if (count <= this.MAX_ERRORS) {
        await this.sleep(this.RETRY_DELAY);
        return this.updateDeviceCapability(capability, value);
      } else {
        this.logger(`[ERROR] Too many errors, giving up`);
        throw error;
      }
    } finally {
      this.pendingUpdates.delete(capability);
    }
  })();
  
  this.pendingUpdates.set(capability, updatePromise);
  return updatePromise;
}
```

## Device Registry Error Tracking

The `DeviceRegistry` class tracks error patterns to identify problematic devices:

```javascript
// Record an error for a device
recordError(deviceId, errorType) {
  const key = `${deviceId}:${errorType}`;
  const currentCount = (this.errorCounts.get(key) || 0) + 1;
  this.errorCounts.set(key, currentCount);
  
  return currentCount;
}

// Check if a device has too many errors
hasTooManyErrors(deviceId, errorType, threshold = 5) {
  return this.getErrorCount(deviceId, errorType) >= threshold;
}
```

## Mapper Error Handling

### BaseMapper Validation

The BaseMapper system ensures capability mapping integrity:

```javascript
// Add a required capability mapping with validation
addRequiredCapability(name, config) {
  // Validate configuration
  if (!config || !config.characteristics) {
    throw new Error(`Invalid capability configuration for ${name}`);
  }
  
  this.capabilities.required[name] = config;
  return this;
}
```

### MappedDevice Error Handling

The MappedDevice class handles service and characteristic errors:

```javascript
// Skip if no characteristics defined for this capability map
if (!characteristicMap.characteristics) {
  this.log(`- [${capability}] skipped (no characteristics defined)`);
  return [];
}

// next step: create characteristics with null checking
const characteristics = [characteristicMap.characteristics].flat().map(klass => {
  if (!klass) {
    this.log(`- [${capability}] warning: null characteristic class`);
    return null;
  }
  
  const characteristic = service.getCharacteristic(klass);
  // ...
}).filter(Boolean); // Filter out any null values
```

## HomeKit Value Validation

### Temperature Range Validation

Special handling for HomeKit's temperature limits (38°C maximum):

```javascript
// Handle temperature values outside the valid range
try {
  const originalValidate = targetTempChar.validateValue;
  targetTempChar.validateValue = function(value) {
    // Cap at HomeKit's limit of 38°C
    if (value > 38) {
      console.log(`Capping temperature from ${value}°C to 38°C due to HomeKit limits`);
      return 38;
    }
    
    if (value <= 38 && value >= 10) {
      return value;
    }
    return originalValidate ? originalValidate.call(this, value) : value;
  };
} catch (error) {
  console.error(`Error overriding validation:`, error);
}
```

## Enhanced Logging for Error Diagnosis

The enhanced logging system provides structured error information:

```javascript
// Error logging with object serialization
error(message, error = null) {
  let processedError = error;
  
  if (error instanceof Error) {
    processedError = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  
  this.log('error', message, processedError);
}
```

## Common Error Patterns and Solutions

### API Subscription Timeouts

Subscription timeouts are gracefully handled:
- Caught by global unhandled rejection handler
- Logged as warnings rather than errors
- App continues running without crashing
- Retry mechanism implemented for recovery

### Characteristic Value Errors

Invalid values are handled with:
- Range validation before setting values
- Graceful capping of out-of-range values
- Clear logging of value transformations
- Custom validation functions per capability

### Offline Devices

Devices going offline are handled by:
- Caching last known good values
- Tracking error frequencies per device
- Automatic recovery when devices return online
- Graceful degradation of unavailable services

### Service Type Conflicts

The system prevents HomeKit service conflicts:
- Checking for duplicate service UUIDs
- Skipping conflicting mappers
- Prioritizing improved mappers over legacy versions
- Proper service isolation with unique serviceIds

## Implementing Error Handling in Custom Mappers

When creating custom mappers, follow these best practices:

```javascript
// 1. Always specify service type and ID for supplementary services
myMapper.addOptionalCapability('motion_detection', {
  serviceType: Service.MotionSensor,
  serviceId: 'motion',
  characteristics: Characteristic.MotionDetected,
  get: (value) => !!value
});

// 2. Implement safe value conversion with validation
myMapper.addRequiredCapability('target_temperature', {
  characteristics: Characteristic.TargetTemperature,
  get: (value) => {
    // Safe value conversion with limits
    const safeTemp = Math.min(Math.max(value, 10), 38);
    console.log(`Temperature capped from ${value} to ${safeTemp}`);
    return safeTemp;
  }
});

// 3. Handle null values gracefully
myMapper.addOptionalCapability('some_capability', {
  characteristics: Characteristic.SomeCharacteristic,
  get: (value) => {
    if (value === null || value === undefined) {
      return SomeDefaultValue;
    }
    return transformValue(value);
  }
});
```

## Error Monitoring and Telemetry

The system provides several ways to monitor errors:

1. **Log Analysis**:
   - Check exceptions.log for all error messages
   - Review warnings.log for potential issues
   - Monitor app.log for general system status

2. **Device Error Tracking**:
   - DeviceRegistry tracks error counts per device
   - Error patterns are logged for analysis
   - Repeated errors trigger special handling

3. **Subscription Status**:
   - CapabilityObserver logs subscription status
   - Retry attempts are recorded
   - Successful recoveries are reported

## Conclusion

HomeKitty's multi-layered error handling architecture ensures:

1. **Robustness**: The system continues functioning despite errors
2. **Recoverability**: Automatic recovery from transient issues
3. **Visibility**: Comprehensive logging for diagnostics
4. **Graceful Degradation**: Limited functionality over complete failure
5. **User Experience**: Minimal impact on end-user experience

This approach creates a resilient system that can handle a wide variety of error conditions while maintaining stability and reliability.