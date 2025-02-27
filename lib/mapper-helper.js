const { Characteristic } = require('../modules/hap-nodejs');

function createMapping(config) {
  const {
    deviceClass = 'generic',
    service,
    category,
    onService,
    required = {},
    optional = {},
    requiredMatchPercentage = 40,
    fallbackEnabled = false,
    fallbackServices = [],
    isFallbackMap = false
  } = config;

  return {
    class: deviceClass,
    service,
    category,
    onService,
    required,
    optional,
    requiredMatchPercentage,
    fallbackEnabled,
    fallbackServices,
    isFallbackMap
  };
}

const MapperUtils = {
  // Safe value transformation for different characteristic types
  safeValue: {
    temperature: (value, defaultTemp = 20) => {
      return (value !== null && !isNaN(value)) 
        ? Number(value) 
        : defaultTemp;
    },
    
    boolean: (value) => {
      return value ? 1 : 0;
    },
    
    heatingCoolingState: (value) => {
      const validStates = [
        Characteristic.TargetHeatingCoolingState.OFF,
        Characteristic.TargetHeatingCoolingState.HEAT,
        Characteristic.TargetHeatingCoolingState.COOL,
        Characteristic.TargetHeatingCoolingState.AUTO
      ];
      
      return validStates.includes(value) 
        ? value 
        : Characteristic.TargetHeatingCoolingState.OFF;
    },
    
    batteryLevel: (value, defaultLevel = 50) => {
      return (value !== null && !isNaN(value)) 
        ? Math.min(Math.max(Number(value), 0), 100) 
        : defaultLevel;
    },
    
    programmableSwitchEvent: (value) => {
      const validEvents = [
        Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
        Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS,
        Characteristic.ProgrammableSwitchEvent.LONG_PRESS
      ];
      
      return validEvents.includes(value) 
        ? value 
        : Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
    }
  },

  // Wrapper for safe characteristic value retrieval
  getSafeValue: (type, value, options = {}) => {
    const safeValueMethod = MapperUtils.safeValue[type];
    if (!safeValueMethod) {
      console.warn(`No safe value method for type: ${type}`);
      return value;
    }
    return safeValueMethod(value, options.defaultValue);
  }
};

module.exports = {
  createMapping,
  MapperUtils
};