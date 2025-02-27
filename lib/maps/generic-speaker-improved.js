// generic-speaker-improved.js - Universal speaker mapper for any audio device

const BaseMapper = require('../mapper-base');

/**
 * Create a generic speaker mapper that can handle any speaker-like device
 * as a last resort if more specific mappers don't match
 */
module.exports = (Mapper, Service, Characteristic, Accessory) => {
  const genericSpeakerMapper = new BaseMapper(
    // Device classes - match any speaker
    ['speaker'],
    // HomeKit service - use standard Speaker service for maximum compatibility
    Service.Speaker,
    {
      // Configuration options
      requiredMatchPercentage: 10, // Ultra low threshold to catch any speakers
      fallbackEnabled: true, // Enable fallback mode
      isFallbackMap: true, // Mark as a fallback map
      name: 'Generic Speaker',
      category: Accessory.Categories.SPEAKER,
      // Setup service when created
      onService: (service, { device }) => {
        // Set speaker name
        service.setCharacteristic(
          Characteristic.Name, 
          `${device.name} Speaker`
        );
      }
    }
  );

  //------------------ MINIMAL REQUIRED CAPABILITIES -------------------//
  
  // Most basic requirement - just need ANY capability to match
  genericSpeakerMapper.addRequiredCapability('volume_set', {
    characteristics: Characteristic.Volume,
    get: (value) => {
      // Convert 0-1 to 0-100 with defaults if missing
      if (value === null || value === undefined || isNaN(value)) {
        return 50; // Default to 50% volume
      }
      return Math.round(value * 100);
    },
    set: (value) => {
      // Convert 0-100 to 0-1 with bounds checking
      return Math.max(0, Math.min(1, value / 100));
    }
  });
  
  //------------------ OPTIONAL CAPABILITIES -------------------//
  
  // Mute control if available
  genericSpeakerMapper.addOptionalCapability('volume_mute', {
    characteristics: Characteristic.Mute,
    get: (value) => {
      // Convert to boolean with default
      return value === true;
    },
    set: (value) => {
      return !!value;
    }
  });
  
  // Power/active state if available
  genericSpeakerMapper.addOptionalCapability('onoff', {
    characteristics: Characteristic.Active,
    get: (value) => value === true ? 1 : 0,
    set: (value) => value === 1
  });
  
  // Playing state as secondary active control
  genericSpeakerMapper.addOptionalCapability('speaker_playing', {
    characteristics: Characteristic.Active,
    get: (value) => value === true ? 1 : 0,
    set: (value) => value === 1
  });
  
  // Map ANY possible capability that might exist on various speaker types
  // With null value filtering to prevent duplicate updates
  genericSpeakerMapper.addOptionalCapability('speaker_next', {
    characteristics: Characteristic.Mute, // Reuse mute as a trigger
    get: (value) => {
      // Skip updates when value is null
      if (value === null) return undefined;
      return false; // Default off
    },
    set: (value) => {
      // Only trigger on unmute
      if (value === false) {
        return true; // Execute next action
      }
      return false;
    }
  });
  
  genericSpeakerMapper.addOptionalCapability('speaker_prev', {
    characteristics: Characteristic.Mute, // Reuse mute as a trigger
    get: (value) => {
      // Skip updates when value is null
      if (value === null) return undefined;
      return false; // Default off
    },
    set: (value) => {
      // Only trigger on mute
      if (value === true) {
        return true; // Execute prev action
      }
      return false;
    }
  });
  
  // Handle track info if available (for display purposes)
  genericSpeakerMapper.addOptionalCapability('speaker_track', {
    characteristics: Characteristic.Name,
    get: (value, { device }) => {
      // Combine track and artist for display
      const artist = device.capabilitiesObj?.speaker_artist?.value;
      if (artist && value) {
        return `${value} - ${artist}`;
      }
      return value || device.name;
    }
  });
  
  // Return the built mapper configuration
  return genericSpeakerMapper.build();
};