# Speaker Integration Guide

This document explains how HomeKitty supports various types of speakers using the new mapping system.

## Speaker Support Strategy

HomeKit provides limited native support for audio devices, so HomeKitty uses a tiered approach to map different speaker types:

1. **Specialized Mappers** - For specific speaker brands/models (Sonos, Chromecast, etc.)
2. **Generic Mapper** - A fallback for any speaker-like device

## Speaker Types

### Sonos Speakers

The `sonos-speaker-improved.js` mapper is optimized for Sonos devices and supports:

- **Core Controls**: 
  - Play/pause/stop
  - Volume control and muting
  - Track navigation (next/previous)
  
- **Advanced Features**:
  - Group management
  - Track information display
  - Repeat/shuffle modes
  - Audio clip playback
  
- **HomeKit Integration**:
  - Uses the `SmartSpeaker` service
  - Shows current track and artist in HomeKit
  - Supports remote control via HomeKit

### Chromecast & Media Devices

The `chromecast-speaker-improved.js` mapper supports Chromecast and similar streaming devices:

- **Core Controls**:
  - Volume control
  - Muting
  - Play/pause functionality
  
- **Media Controls**:
  - Track navigation
  - Content information
  
- **HomeKit Integration**:
  - Uses the `Television` service for better control
  - Shows the current app/content name
  - Provides remote control functionality

### Generic Speakers

The `generic-speaker-improved.js` mapper ensures all speakers have at least basic functionality:

- **Core Controls**:
  - Volume control
  - Muting (if available)
  - Power state
  
- **HomeKit Integration**:
  - Uses the standard `Speaker` service
  - Provides simplified but reliable controls
  - Ultra-low matching threshold (10%) to catch any speaker

## Capability Mapping

The following table shows how speaker capabilities map to HomeKit characteristics:

| Homey Capability | HomeKit Characteristic | Speaker Type |
|------------------|------------------------|--------------|
| volume_set | Volume | All |
| volume_mute | Mute | All |
| speaker_playing | CurrentMediaState/TargetMediaState | Sonos |
| speaker_playing | Active | Chromecast, Generic |
| speaker_next | RemoteKey | Sonos, Chromecast |
| speaker_prev | RemoteKey | Sonos, Chromecast |
| speaker_track | ConfiguredName | All |
| sonos_group | Name | Sonos |
| speaker_artist | Name/InputSourceType | All |

## Special Considerations

1. **Group Management**: For Sonos speakers, group information is preserved and displayed in HomeKit

2. **Streaming Devices**: Chromecast and similar devices use the Television service to provide better remote control functionality

3. **Fallback Approach**: If a device doesn't match specific mappers, the generic speaker mapper provides basic functionality

4. **Sonos-Specific Features**: Extended support for Sonos speakers with capabilities like audio_clip and line_in functionality

## Usage Notes

- For best results, speakers should be added to a dedicated room in HomeKit
- Some advanced functionality may require using manufacturer apps alongside HomeKit
- Volume controls are normalized to work consistently across different speaker types

## Future Improvements

Planned enhancements for speaker support:

1. **AirPlay Integration**: Better integration with AirPlay-capable speakers
2. **Multi-Room Audio**: Enhanced group management across different speaker brands
3. **Media Information**: Improved track/artist information display
4. **Audio Source Selection**: Better support for speakers with multiple inputs
5. **Speaker Categories**: More accurate representation of speaker types in HomeKit