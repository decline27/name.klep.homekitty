// xpeng-car.js - XPeng vehicle mapper for HomeKit integration

const BaseMapper = require('../mapper-base');
const Logger = require('../logger');

/**
 * Create a specialized mapper for XPeng vehicles
 * Maps vehicle capabilities to HomeKit controls
 */
module.exports = (Mapper, Service, Characteristic, Accessory) => {
  const xpengCarMapper = new BaseMapper(
    // Device classes - include "other" for generic device class
    ['car', 'vehicle', 'other'],
    // HomeKit service
    Service.GarageDoorOpener,
    {
      // Configuration options
      requiredMatchPercentage: 10, // Lower threshold for matching
      fallbackEnabled: true, // Enable fallback mode for flexibility
      name: 'XPeng Vehicle',
      isFallbackMap: false,
      category: Accessory.Categories.GARAGE_DOOR_OPENER,
      // Setup service when created
      onService: (service, { device }) => {
        // Set vehicle name
        service.setCharacteristic(
          Characteristic.Name, 
          `${device.name}`
        );
        
        // Set default states
        service.setCharacteristic(
          Characteristic.CurrentDoorState,
          Characteristic.CurrentDoorState.CLOSED
        );
        
        // Log service creation
        Logger.info(`[XPeng Vehicle] Created service for ${device.name}`);
      }
    }
  );

  //------------------ CORE VEHICLE CAPABILITIES WITH ACTUAL CAPABILITY NAMES -------------------//
  
  // Battery level as primary capability (must be present for match)
  xpengCarMapper.addRequiredCapability('batteryLevel', {
    characteristics: Characteristic.BatteryLevel,
    get: (value) => {
      // Map battery level directly (already 0-100%)
      Logger.info(`[XPeng Vehicle] Battery level: ${value}%`);
      return BaseMapper.ValueConverter.batteryLevel(value);
    }
  });
  
  // Charging status
  xpengCarMapper.addOptionalCapability('chargingStatus', {
    characteristics: [Characteristic.StatusLowBattery, Characteristic.ChargingState],
    get: (value, { characteristic }) => {
      Logger.info(`[XPeng Vehicle] Charging status: ${value}`);
      // Map charging status to appropriate characteristic
      if (characteristic === 'StatusLowBattery') {
        return value === 'charging' ? 
          Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL : 
          Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
      } else {
        // ChargingState values: NOT_CHARGING = 0, CHARGING = 1, NOT_CHARGEABLE = 2
        return value === 'charging' ? 1 : 0;
      }
    }
  });
  
  // Plugged in status mapped to door state
  xpengCarMapper.addOptionalCapability('pluggedInStatus', {
    characteristics: [Characteristic.TargetDoorState, Characteristic.CurrentDoorState],
    get: (value, { characteristic }) => {
      Logger.info(`[XPeng Vehicle] Plugged in status: ${value}`);
      // Map plugged status to door state (plugged = closed/locked, unplugged = open/unlocked)
      if (characteristic === 'TargetDoorState') {
        return value ? 
          Characteristic.TargetDoorState.CLOSED : 
          Characteristic.TargetDoorState.OPEN;
      } else {
        return value ? 
          Characteristic.CurrentDoorState.CLOSED : 
          Characteristic.CurrentDoorState.OPEN;
      }
    },
    set: (value) => {
      // Target door state mapping: 1 = closed/locked, 0 = open/unlocked
      return value === Characteristic.TargetDoorState.CLOSED;
    }
  });
  
  // Range information
  xpengCarMapper.addOptionalCapability('range', {
    characteristics: Characteristic.RotationSpeed,
    get: (value) => {
      // Map vehicle range to rotation speed (0-100)
      Logger.info(`[XPeng Vehicle] Range: ${value} km`);
      // Assuming max range of 500 km, scale to 0-100
      return BaseMapper.ValueConverter.mapRange(value, 0, 500, 0, 100);
    }
  });
  
  // Location info
  xpengCarMapper.addOptionalCapability('location', {
    characteristics: Characteristic.Brightness,
    get: (value) => {
      // Just acknowledging the presence of location data
      Logger.info(`[XPeng Vehicle] Has location data`);
      return 100; // Default brightness value
    }
  });
  
  // Charging limit
  xpengCarMapper.addOptionalCapability('chargingLimit', {
    characteristics: Characteristic.Volume,
    get: (value) => {
      // Map charging limit directly (0-100%)
      Logger.info(`[XPeng Vehicle] Charging limit: ${value}%`);
      return value > 0 ? value : 80; // Default to 80% if not set
    },
    set: (value) => {
      // Directly use the value (already 0-100)
      return value;
    }
  });
  
  // Last seen timestamp
  xpengCarMapper.addOptionalCapability('lastSeen', {
    characteristics: Characteristic.LastActivation,
    get: (value) => {
      // Convert to Unix timestamp if needed
      Logger.info(`[XPeng Vehicle] Last seen: ${value}`);
      if (typeof value === 'string') {
        return new Date(value).getTime() / 1000;
      }
      return Math.floor(Date.now() / 1000);
    }
  });
  
  // Return the built mapper configuration
  return xpengCarMapper.build();
};