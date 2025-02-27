// mapper-capability-utils.js - Utility functions for capability handling

/**
 * Utility functions for handling capabilities in a consistent way
 * across different device mappers
 */

const { Characteristic } = require('../modules/hap-nodejs');

/**
 * Converts various capability values to appropriate HomeKit values
 */
class ValueConverter {
  /**
   * Safely convert temperature values
   * @param {number} value - The temperature value
   * @param {number} defaultValue - Default temperature if value is invalid
   * @returns {number} - Valid temperature value
   */
  static temperature(value, defaultValue = 20) {
    return (value !== null && !isNaN(value)) 
      ? Number(value) 
      : defaultValue;
  }

  /**
   * Convert boolean values to HomeKit format
   * @param {any} value - Input value
   * @returns {number} - 0 or 1
   */
  static boolean(value) {
    return value ? 1 : 0;
  }

  /**
   * Convert percentage values (0-1) to HomeKit percentage (0-100)
   * @param {number} value - Input value (0-1)
   * @returns {number} - Value scaled to 0-100
   */
  static percentage(value) {
    if (value === null || isNaN(value)) return 0;
    return Math.min(Math.max(value * 100, 0), 100);
  }

  /**
   * Convert HomeKit percentage (0-100) to device percentage (0-1)
   * @param {number} value - Input value (0-100)
   * @returns {number} - Value scaled to 0-1
   */
  static percentageReverse(value) {
    if (value === null || isNaN(value)) return 0;
    return Math.min(Math.max(value / 100, 0), 1);
  }

  /**
   * Convert battery level to HomeKit format
   * @param {number} value - Battery level
   * @param {number} defaultValue - Default level if invalid
   * @returns {number} - Valid battery level (0-100)
   */
  static batteryLevel(value, defaultValue = 50) {
    return (value !== null && !isNaN(value)) 
      ? Math.min(Math.max(Number(value), 0), 100) 
      : defaultValue;
  }

  /**
   * Map numeric values from one range to another
   * @param {number} value - Input value
   * @param {number} inMin - Input minimum
   * @param {number} inMax - Input maximum
   * @param {number} outMin - Output minimum
   * @param {number} outMax - Output maximum
   * @returns {number} - Mapped value
   */
  static mapRange(value, inMin, inMax, outMin, outMax) {
    if (value === null || isNaN(value)) return outMin;
    return ((value - inMin) * (outMax - outMin) / (inMax - inMin)) + outMin;
  }

  /**
   * Convert to appropriate HomeKit heating/cooling state
   * @param {number} value - Input state
   * @returns {number} - Valid HomeKit heating/cooling state
   */
  static heatingCoolingState(value) {
    const validStates = [
      Characteristic.TargetHeatingCoolingState.OFF,
      Characteristic.TargetHeatingCoolingState.HEAT,
      Characteristic.TargetHeatingCoolingState.COOL,
      Characteristic.TargetHeatingCoolingState.AUTO
    ];
    
    return validStates.includes(value) 
      ? value 
      : Characteristic.TargetHeatingCoolingState.OFF;
  }
}

/**
 * Create common capability mappings that can be reused across different devices
 */
class CapabilityMapper {
  /**
   * Create a standard on/off capability mapping
   * @returns {Object} - Capability mapping configuration
   */
  static onOff() {
    return {
      characteristics: Characteristic.On,
      get: (value) => !!value,
      set: (value) => !!value
    };
  }

  /**
   * Create a standard dim capability mapping
   * @returns {Object} - Capability mapping configuration
   */
  static dim() {
    return {
      characteristics: Characteristic.Brightness,
      get: (value) => ValueConverter.percentage(value),
      set: (value) => ValueConverter.percentageReverse(value)
    };
  }

  /**
   * Create a standard temperature sensor mapping
   * @returns {Object} - Capability mapping configuration
   */
  static temperatureSensor() {
    return {
      characteristics: Characteristic.CurrentTemperature,
      get: (value) => ValueConverter.temperature(value)
    };
  }

  /**
   * Create a standard battery level mapping
   * @returns {Object} - Capability mapping configuration
   */
  static batteryLevel() {
    return {
      characteristics: Characteristic.BatteryLevel,
      get: (value) => ValueConverter.batteryLevel(value)
    };
  }

  /**
   * Create a standard motion sensor mapping
   * @returns {Object} - Capability mapping configuration
   */
  static motionSensor() {
    return {
      characteristics: Characteristic.MotionDetected,
      get: (value) => !!value
    };
  }

  /**
   * Create a standard contact sensor mapping
   * @returns {Object} - Capability mapping configuration
   */
  static contactSensor() {
    return {
      characteristics: Characteristic.ContactSensorState,
      get: (value) => value ? 1 : 0
    };
  }
  
  /**
   * Create a power meter mapping that indicates on/off state based on power consumption
   * @param {number} threshold - Power threshold in watts to consider "on" (default: 1W)
   * @returns {Object} - Capability mapping configuration
   */
  static powerMeter(threshold = 1) {
    return {
      characteristics: Characteristic.On,
      get: (value) => value > threshold
    };
  }
  
  /**
   * Create a power meter mapping for outlet in use characteristic
   * @returns {Object} - Capability mapping configuration
   */
  static outletInUse() {
    return {
      characteristics: Characteristic.OutletInUse,
      get: (value) => true // Always show as in use if it has power measurement
    };
  }
}

module.exports = {
  ValueConverter,
  CapabilityMapper
};