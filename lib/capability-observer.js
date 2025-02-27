// capability-observer.js - Implements a more efficient capability monitoring system

/**
 * CapabilityObserver reduces redundant device capability monitoring
 * by sharing a single monitoring instance across multiple characteristics
 */
class CapabilityObserver {
  /**
   * Create a new CapabilityObserver
   * @param {Object} device - The device to observe
   * @param {Function} logger - Logging function
   */
  constructor(device, logger = console.log) {
    this.device = device;
    this.logger = logger;
    this.observers = new Map(); // capability -> Set of callbacks
    this.capabilities = new Map(); // capability -> instance
    this.lastValues = new Map(); // capability -> last value
  }

  /**
   * Start observing a capability
   * @param {string} capability - The capability to observe
   * @param {Function} callback - Function to call on capability change
   * @param {number} debounceTime - Optional debounce timeout
   */
  observe(capability, callback, debounceTime = 0) {
    // Initialize observer set if it doesn't exist
    if (!this.observers.has(capability)) {
      this.observers.set(capability, new Set());
      
      this.createCapabilityInstance(capability);
    }
    
    // Add this callback to the observers
    this.observers.get(capability).add(callback);
    
    // If we have a current value, immediately call the callback
    if (this.lastValues.has(capability)) {
      try {
        callback(this.lastValues.get(capability));
      } catch (error) {
        this.logger(`[ERROR] Callback error for ${capability}: ${error.message}`);
      }
    }
  }

  /**
   * Stop observing a capability
   * @param {string} capability - The capability to stop observing
   * @param {Function} callback - The callback to remove
   */
  unobserve(capability, callback) {
    if (!this.observers.has(capability)) return;
    
    // Remove this specific callback
    this.observers.get(capability).delete(callback);
    
    // If no more observers, clean up the capability instance
    if (this.observers.get(capability).size === 0) {
      this.cleanup(capability);
    }
  }

  /**
   * Notify all observers of a capability change
   * @param {string} capability - The capability that changed
   * @param {any} value - The new value
   */
  notifyObservers(capability, value) {
    if (!this.observers.has(capability)) return;
    
    for (const callback of this.observers.get(capability)) {
      try {
        callback(value);
      } catch (error) {
        this.logger(`[ERROR] Observer callback error for ${capability}: ${error.message}`);
      }
    }
  }

  /**
   * Clean up a specific capability
   * @param {string} capability - The capability to clean up
   */
  cleanup(capability) {
    // Remove capability instance
    const instance = this.capabilities.get(capability);
    if (instance && typeof instance.destroy === 'function') {
      try {
        instance.destroy();
      } catch (error) {
        this.logger(`[ERROR] Failed to destroy capability instance ${capability}: ${error.message}`);
      }
    }
    
    // Clean up maps
    this.capabilities.delete(capability);
    this.observers.delete(capability);
    this.lastValues.delete(capability);
  }

  /**
   * Clean up all capability observations
   */
  cleanupAll() {
    for (const capability of this.capabilities.keys()) {
      this.cleanup(capability);
    }
  }

  /**
   * Get the current value of a capability
   * @param {string} capability - The capability to get
   * @returns {any} - The current value or undefined
   */
  getCurrentValue(capability) {
    return this.lastValues.get(capability);
  }

  /**
   * Get all observed capabilities
   * @returns {string[]} - Array of capability names
   */
  getObservedCapabilities() {
    return Array.from(this.capabilities.keys());
  }
  
  /**
   * Creates a capability instance with retry logic
   * @param {string} capability - The capability to create an instance for
   * @param {number} retryCount - Current retry count (internal use)
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} initialDelay - Initial delay in ms
   * @param {number} maxDelay - Maximum delay in ms
   */
  async createCapabilityInstance(capability, retryCount = 0, maxRetries = 3, initialDelay = 1000, maxDelay = 10000) {
    try {
      // Create capability instance with error handling
      const instance = this.device.makeCapabilityInstance(capability, value => {
        // Store latest value
        this.lastValues.set(capability, value);
        
        // Notify all observers
        this.notifyObservers(capability, value);
      });
      
      this.capabilities.set(capability, instance);
      
      // Get initial value if available
      if (this.device.capabilitiesObj?.[capability]?.value !== undefined) {
        this.lastValues.set(capability, this.device.capabilitiesObj[capability].value);
      }
      
      // Log success after retries
      if (retryCount > 0) {
        this.logger(`[SUCCESS] Successfully created capability instance for ${capability} after ${retryCount} retries`);
      }
    } catch (error) {
      // Log the error
      this.logger(`[ERROR] Failed to observe capability ${capability}: ${error.message}`);
      
      if (retryCount < maxRetries) {
        // Calculate exponential backoff delay (capped at maxDelay)
        const delay = Math.min(initialDelay * Math.pow(2, retryCount), maxDelay);
        
        // Log retry attempt
        this.logger(`[RETRY] Retrying capability ${capability} in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        
        // Use a timeout to retry after delay
        setTimeout(() => {
          this.createCapabilityInstance(capability, retryCount + 1, maxRetries, initialDelay, maxDelay);
        }, delay);
      } else {
        // Log final failure
        this.logger(`[FAILED] Max retries reached for capability ${capability}. Using cached values only.`);
        
        // Create fallback mechanism for failed subscriptions
        // Still store the capability in our maps so we can at least use initial/cached values
        this.capabilities.set(capability, null);
      }
    }
  }
}

module.exports = CapabilityObserver;