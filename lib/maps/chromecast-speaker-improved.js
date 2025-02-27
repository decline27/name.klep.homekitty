// chromecast-speaker-improved.js - Enhanced Chromecast device mapper

const BaseMapper = require('../mapper-base');

/**
 * Create a specialized mapper for Chromecast devices and other generic speakers
 * with more flexible matching to support various speaker types
 */
module.exports = (Mapper, Service, Characteristic, Accessory) => {
  const chromecastMapper = new BaseMapper(
    // Device classes
    ['speaker'],
    // HomeKit service
    Service.Television, // Using Television service for better speaker control
    {
      // Configuration options
      requiredMatchPercentage: 25, // Low threshold for generic speakers
      fallbackEnabled: true, // Enable fallback mode
      name: 'Chromecast Speaker',
      // Check for Chromecast-specific attributes
      isFallbackMap: false,
      // Add specific forbidden capabilities to prevent incorrect matches
      forbidden: ['sonos_audio_clip', 'sonos_group', 'sonos_line_in'],
      // Setup service when created
      onService: (service, { device }) => {
        // Set speaker name and configured type
        service.setCharacteristic(
          Characteristic.Name, 
          `${device.name}`
        );
        
        // Set this as a streaming device
        service.setCharacteristic(
          Characteristic.ConfiguredName,
          `${device.name} Streaming Device`
        );
        
        // Set as active by default
        service.setCharacteristic(
          Characteristic.Active,
          1
        );
        
        // Set device category to streaming stick
        service.setCharacteristic(
          Characteristic.ActiveIdentifier,
          2 // STREAMING_STICK = 2
        );
      }
    }
  );

  //------------------ CORE CAPABILITIES -------------------//
  
  // Core volume control - will be the main matching capability
  chromecastMapper.addRequiredCapability('volume_set', {
    characteristics: Characteristic.Volume,
    get: (value) => BaseMapper.ValueConverter.percentage(value),
    set: (value) => BaseMapper.ValueConverter.percentageReverse(value)
  });
  
  // Power state - mapped to active characteristic
  chromecastMapper.addOptionalCapability('speaker_playing', {
    characteristics: Characteristic.Active,
    get: (value) => value === true ? 1 : 0, // 1 = active, 0 = inactive
    set: (value) => value === 1 // true = playing, false = stopped
  });
  
  // Mute control
  chromecastMapper.addOptionalCapability('volume_mute', {
    characteristics: Characteristic.Mute,
    get: (value) => !!value,
    set: (value) => !!value
  });
  
  //------------------ REMOTE CONTROL CAPABILITIES -------------------//
  
  // Track navigation with null filtering
  chromecastMapper.addOptionalCapability('speaker_next', {
    characteristics: Characteristic.RemoteKey,
    get: (value) => {
      // Skip updates when value is null to prevent multiple updates
      // Use default value 0 instead of undefined to avoid HomeKit errors
      if (value === null) return 0;
      return 7; // NEXT = 7
    },
    set: (value) => {
      if (value === 7) return true;
      return false;
    }
  });
  
  chromecastMapper.addOptionalCapability('speaker_prev', {
    characteristics: Characteristic.RemoteKey,
    get: (value) => {
      // Skip updates when value is null to prevent multiple updates
      // Use default value 0 instead of undefined to avoid HomeKit errors
      if (value === null) return 0;
      return 6; // BACK = 6
    },
    set: (value) => {
      if (value === 6) return true;
      return false;
    }
  });
  
  // Play/pause mapped to play/pause remote key
  chromecastMapper.addOptionalCapability('speaker_playing', {
    characteristics: Characteristic.RemoteKey,
    get: () => 11, // PLAY_PAUSE = 11
    set: (value) => {
      if (value === 11) {
        // Toggle play state
        return true;
      }
      return false;
    }
  });
  
  //------------------ CONTENT INFO CAPABILITIES -------------------//
  
  // Track info mapped to current media
  chromecastMapper.addOptionalCapability('speaker_track', {
    characteristics: Characteristic.ConfiguredName,
    get: (value, { device }) => {
      // Create a display name from what's playing
      return value || 'Unknown Content';
    }
  });
  
  // App/service info mapped to input source
  chromecastMapper.addOptionalCapability('speaker_artist', {
    characteristics: Characteristic.InputSourceType,
    get: (value) => {
      // Map common cast sources to HomeKit input types
      if (value?.toLowerCase().includes('netflix')) {
        return 3; // APPLICATION = 3
      } else if (value?.toLowerCase().includes('youtube')) {
        return 3; // APPLICATION = 3
      } else if (value?.toLowerCase().includes('spotify')) {
        return 2; // AUDIO_SYSTEM = 2
      } else {
        return 0; // OTHER = 0
      }
    }
  });
  
  // Return the built mapper configuration
  return chromecastMapper.build();
};