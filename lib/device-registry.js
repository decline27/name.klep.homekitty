// device-registry.js - Implements a registry for tracking device mapping information

/**
 * Registry for managing device mapping information and caching
 * Provides faster lookups and better memory management
 */
class DeviceRegistry {
  constructor(logger = console.log) {
    this.devices = new Map();
    this.mappingCache = new Map();
    this.errorCounts = new Map();
    this.logger = logger;
  }

  /**
   * Register a device in the registry
   * @param {Object} device - The device to register
   * @returns {Object} - The registered device
   */
  registerDevice(device) {
    if (!device || !device.id) {
      this.logger(`[ERROR] Cannot register device without ID`);
      return null;
    }

    // Store basic information about the device
    this.devices.set(device.id, {
      id: device.id,
      name: device.name || 'Unknown',
      class: device.class,
      virtualClass: device.virtualClass,
      zone: device.zone,
      capabilities: [...(device.capabilities || [])],
      lastUpdated: Date.now()
    });

    return this.devices.get(device.id);
  }

  /**
   * Check if a device exists in the registry
   * @param {string} deviceId - Device ID to check
   * @returns {boolean} - True if device exists
   */
  hasDevice(deviceId) {
    return this.devices.has(deviceId);
  }

  /**
   * Get a device from the registry
   * @param {string} deviceId - Device ID to retrieve
   * @returns {Object|null} - The device or null if not found
   */
  getDevice(deviceId) {
    return this.devices.get(deviceId) || null;
  }

  /**
   * Remove a device from the registry
   * @param {string} deviceId - Device ID to remove
   */
  removeDevice(deviceId) {
    this.devices.delete(deviceId);
    this.mappingCache.delete(deviceId);
    this.errorCounts.delete(deviceId);
  }

  /**
   * Store mapping information for a device
   * @param {string} deviceId - Device ID
   * @param {Object} mappingInfo - Information about the mapping
   */
  setMappingInfo(deviceId, mappingInfo) {
    if (!deviceId) return;
    
    this.mappingCache.set(deviceId, {
      mappingInfo,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached mapping information for a device
   * @param {string} deviceId - Device ID
   * @returns {Object|null} - Cached mapping information or null
   */
  getMappingInfo(deviceId) {
    if (!deviceId || !this.mappingCache.has(deviceId)) return null;
    return this.mappingCache.get(deviceId).mappingInfo;
  }

  /**
   * Check if mapping information needs to be refreshed based on device changes
   * @param {string} deviceId - Device ID
   * @param {Object} currentDevice - Current device state
   * @returns {boolean} - True if mapping should be refreshed
   */
  shouldRefreshMapping(deviceId, currentDevice) {
    if (!deviceId || !this.mappingCache.has(deviceId)) return true;
    
    const cachedInfo = this.devices.get(deviceId);
    if (!cachedInfo) return true;
    
    // Check if important properties have changed
    if (cachedInfo.class !== currentDevice.class) return true;
    if (cachedInfo.virtualClass !== currentDevice.virtualClass) return true;
    
    // Check if capabilities have changed
    const oldCaps = new Set(cachedInfo.capabilities);
    const newCaps = new Set(currentDevice.capabilities || []);
    
    if (oldCaps.size !== newCaps.size) return true;
    
    for (const cap of oldCaps) {
      if (!newCaps.has(cap)) return true;
    }
    
    return false;
  }

  /**
   * Record an error for a device
   * @param {string} deviceId - Device ID
   * @param {string} errorType - Type of error
   * @returns {number} - Current error count
   */
  recordError(deviceId, errorType) {
    if (!deviceId) return 0;
    
    const key = `${deviceId}:${errorType}`;
    const currentCount = (this.errorCounts.get(key) || 0) + 1;
    this.errorCounts.set(key, currentCount);
    
    return currentCount;
  }

  /**
   * Reset error count for a device
   * @param {string} deviceId - Device ID
   * @param {string} errorType - Type of error (optional)
   */
  resetErrors(deviceId, errorType = null) {
    if (!deviceId) return;
    
    if (errorType) {
      // Reset specific error type
      this.errorCounts.delete(`${deviceId}:${errorType}`);
    } else {
      // Reset all errors for this device
      for (const key of this.errorCounts.keys()) {
        if (key.startsWith(`${deviceId}:`)) {
          this.errorCounts.delete(key);
        }
      }
    }
  }

  /**
   * Get error count for a device
   * @param {string} deviceId - Device ID
   * @param {string} errorType - Type of error
   * @returns {number} - Current error count
   */
  getErrorCount(deviceId, errorType) {
    if (!deviceId) return 0;
    
    const key = `${deviceId}:${errorType}`;
    return this.errorCounts.get(key) || 0;
  }

  /**
   * Check if a device has too many errors (should be excluded)
   * @param {string} deviceId - Device ID
   * @param {string} errorType - Type of error
   * @param {number} threshold - Error threshold (default: 5)
   * @returns {boolean} - True if error count exceeds threshold
   */
  hasTooManyErrors(deviceId, errorType, threshold = 5) {
    return this.getErrorCount(deviceId, errorType) >= threshold;
  }
}

module.exports = DeviceRegistry;