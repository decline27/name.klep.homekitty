// device-state-manager.js - A reliable state management system for device capabilities

/**
 * DeviceStateManager provides a robust state management system
 * with validation, error handling, and state recovery
 */
class DeviceStateManager {
  /**
   * Create a new DeviceStateManager
   * @param {Object} device - The device to manage
   * @param {Function} logger - Logging function
   */
  constructor(device, logger = console.log) {
    this.device = device;
    this.logger = logger;
    this.state = new Map(); // capability -> {value, timestamp, lastSetValue}
    this.pendingUpdates = new Map(); // capability -> Promise
    this.stateValidators = new Map(); // capability -> validation function
    this.errorCounts = new Map(); // capability -> count
    this.MAX_ERRORS = 5;
    this.RETRY_DELAY = 1000; // ms
  }

  /**
   * Register a validator for a capability
   * @param {string} capability - The capability name
   * @param {Function} validator - Validation function (value) => validatedValue
   */
  registerValidator(capability, validator) {
    if (typeof validator !== 'function') {
      this.logger(`[ERROR] Validator for ${capability} is not a function`);
      return;
    }
    
    this.stateValidators.set(capability, validator);
  }

  /**
   * Get the current state of a capability
   * @param {string} capability - The capability name
   * @returns {Promise<any>} - The capability value
   */
  async getState(capability) {
    // Check if we have cached state
    if (this.state.has(capability)) {
      return this.state.get(capability).value;
    }
    
    // If not, request from device
    try {
      const value = await this.device.getCapabilityValue(capability);
      this.updateInternalState(capability, value, false);
      return value;
    } catch (error) {
      this.logger(`[ERROR] Failed to get capability ${capability}: ${error.message}`);
      
      // Record error and handle recovery
      const count = this.incrementErrorCount(capability);
      if (count <= this.MAX_ERRORS) {
        return this.attemptRecovery(capability);
      } else {
        this.logger(`[ERROR] Too many errors for ${capability}, returning null`);
        return null;
      }
    }
  }

  /**
   * Set a new state for a capability
   * @param {string} capability - The capability name
   * @param {any} value - The new value
   * @param {boolean} updateDevice - Whether to update the device
   * @returns {Promise<any>} - The validated value
   */
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
      
      // Update internal state
      this.updateInternalState(capability, value, updateDevice);
      
      // Update device if needed
      if (updateDevice) {
        await this.updateDeviceCapability(capability, value);
      }
      
      return value;
    } catch (error) {
      this.logger(`[ERROR] Failed to set state for ${capability}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update the internal state without updating the device
   * @param {string} capability - The capability name
   * @param {any} value - The new value
   * @param {boolean} isDeviceUpdate - Whether this is from a device update
   */
  updateInternalState(capability, value, isDeviceUpdate) {
    this.state.set(capability, {
      value,
      timestamp: Date.now(),
      lastSetValue: isDeviceUpdate ? value : this.state.get(capability)?.lastSetValue
    });
  }

  /**
   * Update a device capability with error handling
   * @param {string} capability - The capability name
   * @param {any} value - The new value
   * @returns {Promise<void>}
   */
  async updateDeviceCapability(capability, value) {
    // Prevent concurrent updates to the same capability
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
        this.logger(`[DEBUG] Updated capability ${capability} to ${value}`);
        this.resetErrorCount(capability);
        return value;
      } catch (error) {
        this.logger(`[ERROR] Failed to update capability ${capability}: ${error.message}`);
        
        // Record error and attempt recovery if needed
        const count = this.incrementErrorCount(capability);
        if (count <= this.MAX_ERRORS) {
          await this.sleep(this.RETRY_DELAY);
          return this.updateDeviceCapability(capability, value);
        } else {
          this.logger(`[ERROR] Too many errors for ${capability}, giving up`);
          throw error;
        }
      } finally {
        this.pendingUpdates.delete(capability);
      }
    })();
    
    this.pendingUpdates.set(capability, updatePromise);
    return updatePromise;
  }

  /**
   * Attempt to recover a capability value
   * @param {string} capability - The capability name
   * @returns {Promise<any>} - The recovered value or null
   */
  async attemptRecovery(capability) {
    this.logger(`[INFO] Attempting recovery for ${capability}`);
    
    // Wait before retry
    await this.sleep(this.RETRY_DELAY);
    
    try {
      // Try to get the value again
      const value = await this.device.getCapabilityValue(capability);
      this.updateInternalState(capability, value, false);
      this.logger(`[INFO] Recovery successful for ${capability}`);
      this.resetErrorCount(capability);
      return value;
    } catch (error) {
      this.logger(`[ERROR] Recovery failed for ${capability}: ${error.message}`);
      return null;
    }
  }

  /**
   * Increment the error count for a capability
   * @param {string} capability - The capability name
   * @returns {number} - The new error count
   */
  incrementErrorCount(capability) {
    const count = (this.errorCounts.get(capability) || 0) + 1;
    this.errorCounts.set(capability, count);
    return count;
  }

  /**
   * Reset the error count for a capability
   * @param {string} capability - The capability name
   */
  resetErrorCount(capability) {
    this.errorCounts.set(capability, 0);
  }

  /**
   * Helper method to sleep for a specified time
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all managed capabilities
   * @returns {string[]} - Array of capability names
   */
  getManagedCapabilities() {
    return Array.from(this.state.keys());
  }

  /**
   * Get the error status for all capabilities
   * @returns {Object} - Error counts by capability
   */
  getErrorStatus() {
    const result = {};
    for (const [capability, count] of this.errorCounts.entries()) {
      if (count > 0) {
        result[capability] = count;
      }
    }
    return result;
  }

  /**
   * Check if a capability has errors
   * @param {string} capability - The capability name
   * @returns {boolean} - True if capability has errors
   */
  hasErrors(capability) {
    return (this.errorCounts.get(capability) || 0) > 0;
  }
}

module.exports = DeviceStateManager;