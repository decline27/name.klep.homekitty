// sonos-speaker-improved.js - Enhanced Sonos speaker mapper with specialized capabilities

const BaseMapper = require('../mapper-base');

/**
 * Create a specialized mapper for Sonos speakers with enhanced
 * functionality for HomeKit integration
 */
module.exports = (Mapper, Service, Characteristic, Accessory) => {
  const sonosSpeakerMapper = new BaseMapper(
    // Device classes
    ['speaker'],
    // HomeKit service
    Service.SmartSpeaker,
    {
      // Configuration options
      requiredMatchPercentage: 20, // Very permissive matching for Sonos
      fallbackEnabled: true, // Enable fallback mode
      name: 'Sonos Speaker',
      // Check for Sonos-specific capability
      isFallbackMap: false,
      // Add specific forbidden capabilities to prevent conflicting mappers
      forbidden: ['tv_playing', 'chromecast_app', 'tv_input'],
      // Setup service when created
      onService: (service, { device }) => {
        // Set speaker name
        service.setCharacteristic(
          Characteristic.Name, 
          `${device.name}`
        );
      }
    }
  );

  //------------------ CORE PLAYBACK CAPABILITIES -------------------//
  
  // Core playback control - will match as primary requirement if available
  sonosSpeakerMapper.addRequiredCapability('speaker_playing', {
    characteristics: [Characteristic.TargetMediaState, Characteristic.CurrentMediaState],
    get: (value, { characteristic }) => {
      // Target and current media state: PLAY = 0, PAUSE = 1, STOP = 2
      if (characteristic === 'TargetMediaState') {
        return value === true ? 0 : 1; // 0 = play, 1 = pause
      } else {
        return value === true ? 0 : 1; // 0 = playing, 1 = paused
      }
    },
    set: (value) => {
      // Target media state: PLAY = 0, PAUSE = 1, STOP = 2
      return value === 0; // true = playing, false = paused
    }
  });
  
  // Volume control
  sonosSpeakerMapper.addOptionalCapability('volume_set', {
    characteristics: Characteristic.Volume,
    get: (value) => BaseMapper.ValueConverter.percentage(value),
    set: (value) => BaseMapper.ValueConverter.percentageReverse(value)
  });
  
  // Mute control
  sonosSpeakerMapper.addOptionalCapability('volume_mute', {
    characteristics: Characteristic.Mute,
    get: (value) => !!value,
    set: (value) => !!value
  });
  
  //------------------ SONOS-SPECIFIC CAPABILITIES -------------------//
  
  // Track navigation capabilities - with null value filtering
  sonosSpeakerMapper.addOptionalCapability('speaker_next', {
    characteristics: Characteristic.RemoteKey,
    get: (value) => {
      // Skip updates when value is null to prevent duplicate updates
      // Use default value 0 instead of undefined to avoid HomeKit errors
      if (value === null) return 0;
      return 7; // NEXT = 7 (per HomeKit spec)
    },
    set: (value) => {
      // Only trigger on NEXT key code (7)
      if (value === 7) {
        return true; // Trigger next track
      }
      return false; // Don't trigger for other key codes
    }
  });
  
  sonosSpeakerMapper.addOptionalCapability('speaker_prev', {
    characteristics: Characteristic.RemoteKey,
    get: (value) => {
      // Skip updates when value is null to prevent duplicate updates
      // Use default value 0 instead of undefined to avoid HomeKit errors
      if (value === null) return 0;
      return 6; // BACK = 6 (per HomeKit spec)
    },
    set: (value) => {
      // Only trigger on BACK key code (6)
      if (value === 6) {
        return true; // Trigger previous track
      }
      return false; // Don't trigger for other key codes
    }
  });
  
  // Playback mode capabilities
  sonosSpeakerMapper.addOptionalCapability('speaker_repeat', {
    characteristics: Characteristic.CurrentMediaState,
    get: (value) => {
      // Map repeat to media state flags
      if (value === 'all') return 2; // 2 = REPEAT
      return 0; // 0 = DEFAULT
    }
  });
  
  sonosSpeakerMapper.addOptionalCapability('speaker_shuffle', {
    characteristics: Characteristic.CurrentMediaState,
    get: (value) => {
      // Map shuffle to media state flags
      if (value === true) return 4; // 4 = SHUFFLE
      return 0; // 0 = DEFAULT
    }
  });
  
  //------------------ SPEAKER META INFO CAPABILITIES -------------------//
  
  // Track position and duration if available (for progress indication)
  sonosSpeakerMapper.addOptionalCapability('speaker_position', {
    characteristics: Characteristic.CurrentMediaState,
    get: (value, { device }) => {
      // We don't use the value directly, just as a trigger
      // Determine playback state based on position vs duration
      const duration = device.capabilitiesObj?.speaker_duration?.value;
      if (!duration) return 0;
      
      // Calculate progress percentage
      const progress = (value / duration) * 100;
      // Return the media state with progress indication
      return device.capabilitiesObj?.speaker_playing?.value ? 0 : 1;
    }
  });
  
  // Track metadata for display
  sonosSpeakerMapper.addOptionalCapability('speaker_track', {
    characteristics: Characteristic.ConfiguredName,
    get: (value, { device }) => {
      // Create a display name from track and artist
      const artist = device.capabilitiesObj?.speaker_artist?.value || '';
      if (artist && value) {
        return `${value} - ${artist}`;
      }
      return value || 'Unknown Track';
    }
  });
  
  //------------------ SONOS GROUP CAPABILITIES -------------------//
  
  // Group control (Sonos-specific)
  sonosSpeakerMapper.addOptionalCapability('sonos_group', {
    characteristics: Characteristic.Name,
    get: (value) => {
      // Add group info to name if available
      return value || '';
    }
  });
  
  sonosSpeakerMapper.addOptionalCapability('sonos_line_in', {
    characteristics: Characteristic.InputSourceType,
    get: (value) => {
      // Map to HomeKit input source type
      return 3; // AUDIO_SYSTEM = 3
    }
  });
  
  // Audio clip playback support
  sonosSpeakerMapper.addOptionalCapability('sonos_audio_clip', {
    characteristics: Characteristic.TargetMediaState,
    get: () => 1, // PAUSE = 1 (default state)
    set: (value) => {
      // Only trigger on PLAY request
      if (value === 0) {
        return true; // Trigger audio clip playback
      }
      return false;
    }
  });
  
  // Return the built mapper configuration
  return sonosSpeakerMapper.build();
};