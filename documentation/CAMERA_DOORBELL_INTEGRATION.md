# Camera & Doorbell Integration Guide

This guide explains how HomeKitty handles camera and doorbell devices using the enhanced BaseMapper system.

## Camera Support

HomeKit cameras require specific handling to properly expose their video capabilities. The system now provides comprehensive support for various camera types.

### Camera Capabilities

The `camera-improved.js` mapper supports the following capabilities:

- **Basic Controls**
  - `onoff`: Power control for the camera
  - `CMD_START_STREAM`: Stream management
  
- **Motion Detection**
  - `alarm_motion`: Standard motion detection
  - `NTFY_MOTION_DETECTION`: Eufy-specific motion detection
  - `NTFY_FACE_DETECTION`: Face detection events
  - `NTFY_HUMAN_DETECTION`: Human detection
  
- **Additional Features**
  - `measure_battery`: Battery level monitoring
  - `night_vision`: Night vision mode control
  - `microphone`/`speaker`: Audio controls

### Camera Architecture

The improved camera mapper uses a dual-service approach:

1. **Primary Service**: `Service.MotionSensor` serves as the primary service for basic functionality
2. **Secondary Service**: `Service.CameraRTPStreamManagement` handles streaming functionality

This structure ensures compatibility while providing rich functionality:

```javascript
// Using the BaseMapper architecture for structure
const cameraMapper = new BaseMapper(
  ['camera'],
  Service.MotionSensor,
  {
    requiredMatchPercentage: 30,
    category: Accessory.Categories.CAMERA
  }
);

// Add camera streaming service using serviceType parameter
cameraMapper.addOptionalCapability('CMD_START_STREAM', {
  serviceType: Service.CameraRTPStreamManagement,
  serviceId: 'camera',
  characteristics: Characteristic.StreamingStatus
});
```

## Doorbell Support

Doorbells in HomeKit require special handling to properly expose doorbell button events, camera functionality, and additional sensors.

### Standard Doorbell Mapper

The `doorbell-improved.js` mapper supports standard doorbell capabilities:

- **Core Functionality**
  - `button`: Doorbell button press events
  - `volume_set`/`volume_mute`: Volume controls
  - `dim`: Brightness control (for LED/screen)
  
- **Additional Features**
  - `alarm_motion`: Motion detection
  - `measure_battery`: Battery level monitoring

### Eufy Doorbell Integration

The `doorbell-eufy-improved.js` and `doorbell-eufy-camera.js` mappers provide specialized support for Eufy doorbells with enhanced capabilities:

- **Eufy-Specific Capabilities**
  - `NTFY_PRESS_DOORBELL`: Doorbell press events
  - `NTFY_MOTION_DETECTION`: Motion detection
  - `NTFY_FACE_DETECTION`: Face detection
  - `NTFY_PET_DETECTED`: Pet detection
  - `NTFY_VEHICLE_DETECTED`: Vehicle detection
  - `NTFY_PACKAGE_DETECTION`: Package detection
  - `measure_temperature`: Built-in temperature sensor
  - `measure_battery`: Battery monitoring

### Multi-Service Architecture

The enhanced doorbell mappers implement a multi-service approach with proper service differentiation:

1. **Primary Service**: `Service.Doorbell` handles the core doorbell functionality
2. **Motion Service**: `Service.MotionSensor` captures all motion-related capabilities
3. **Battery Service**: `Service.BatteryService` handles power-related functionality
4. **Temperature Service**: `Service.TemperatureSensor` exposes temperature readings

Each service has a unique `serviceId` to avoid collisions:

```javascript
// Button press events through primary doorbell service
eufyDoorbellMapper.addRequiredCapability('NTFY_PRESS_DOORBELL', {
  characteristics: Characteristic.ProgrammableSwitchEvent,
  get: (value) => Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS
});

// Motion detection using dedicated motion service
eufyDoorbellMapper.addOptionalCapability('NTFY_MOTION_DETECTION', {
  serviceType: Service.MotionSensor,
  serviceId: 'motion',
  characteristics: Characteristic.MotionDetected,
  get: (value) => !!value
});

// Battery level using battery service
eufyDoorbellMapper.addOptionalCapability('measure_battery', {
  serviceType: Service.BatteryService,
  serviceId: 'battery',
  characteristics: [Characteristic.BatteryLevel, Characteristic.StatusLowBattery],
  get: (value, { characteristic }) => {
    if (characteristic === 'BatteryLevel') {
      return BaseMapper.ValueConverter.batteryLevel(value);
    } else {
      return value < 20 ? 1 : 0; // Low battery status
    }
  }
});
```

## Error Handling Improvements

The camera and doorbell mappers now implement robust error handling:

1. **Null Characteristic Protection**: Proper handling of null or undefined characteristics
2. **Service Type Validation**: Validation for each service type before using it
3. **Value Range Checking**: Ensuring values are within HomeKit's acceptable ranges
4. **Subscription Retry Logic**: Exponential backoff for subscription failures

### Handling Multiple Detection Types

The system now properly maps multiple detection types (face, pet, vehicle, etc.) to the motion sensor in a way that avoids duplicate updates:

```javascript
// All these capabilities trigger the same motion sensor
eufyDoorbellMapper.addOptionalCapability('NTFY_FACE_DETECTION', {
  serviceType: Service.MotionSensor,
  serviceId: 'motion',
  characteristics: Characteristic.MotionDetected,
  get: (value) => !!value
});

eufyDoorbellMapper.addOptionalCapability('NTFY_PET_DETECTED', {
  serviceType: Service.MotionSensor,
  serviceId: 'motion', 
  characteristics: Characteristic.MotionDetected,
  get: (value) => !!value
});
```

## Mapping Strategy

The improved camera and doorbell mappers follow these enhanced principles:

1. **Service-Oriented Architecture**: Properly structured multi-service design
2. **Flexible Matching**: Lower thresholds (20-30%) for better compatibility
3. **Explicit Service Types**: Clear service type and ID for each capability
4. **Robust Error Handling**: Graceful handling of edge cases and errors
5. **Value Transformation**: Proper value conversion between Homey and HomeKit

## Usage Notes

- These improved mappers are prioritized over legacy mappers
- The system prevents concurrent use of both legacy and improved mappers for the same device
- Service type conflicts are automatically detected and prevented
- Enhanced logging provides detailed insight into mapping decisions

## Implemented Improvements

Recent enhancements to camera and doorbell support:

1. **Multi-Service Architecture**: Proper service structure for complex devices
2. **Subscription Reliability**: Improved handling of capability subscriptions
3. **Eufy-Specific Detection**: Support for all Eufy detection types
4. **Error Resilience**: Graceful handling of null capabilities
5. **Temperature Integration**: Support for doorbell temperature sensors

## Future Development

Planned enhancements:

1. **Streaming Configuration**: Enhanced video stream configuration
2. **Recording Integration**: HomeKit Secure Video integration
3. **Advanced Camera Controls**: Pan, tilt, zoom controls
4. **Enhanced Detection Classification**: More specific detection types
5. **Two-Way Audio**: Improved audio communication support