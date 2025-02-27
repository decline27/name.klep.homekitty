# System Architecture

## Overview

HomeKitty implements a modular, component-based architecture for bridging Homey devices to HomeKit. This document outlines the core system components, their responsibilities, and interactions.

## Core Components

The system is structured around these primary components:

1. **HomeKitty App** (app.js)
   - Entry point and primary controller
   - Manages Homey device discovery and mapping
   - Maintains HomeKit bridge configuration
   - Handles app lifecycle events

2. **Device Mapper** (device-mapper.js)
   - Determines appropriate HomeKit mappings for Homey devices
   - Implements multi-tier mapping selection strategy
   - Prioritizes improved mappers over legacy versions
   - Prevents service conflicts between mappers

3. **Mapped Device** (mapped-device.js) 
   - Represents a Homey device mapped to HomeKit
   - Manages characteristic, services, and capability subscriptions
   - Handles capability to characteristic value transformations
   - Supports multiple services per device

4. **Mapper Base** (mapper-base.js)
   - Base class for creating standardized mappers
   - Provides consistent API for defining device mappings
   - Supports composition and inheritance for mapper reuse
   - Facilitates structured capability configuration

5. **Enhanced Logging** (logger.js, enhanced-logger.js)
   - Provides structured, multi-level logging
   - Supports file and console output
   - Handles log rotation and organization
   - Includes specialized diagnostic logging methods

## Device Management

### Device Registry

The `DeviceRegistry` class (device-registry.js) serves as a central registry for all devices:

- **Responsibilities:**
  - Maintains a persistent registry of all devices
  - Tracks device mapping information and caching
  - Monitors device error patterns and frequencies
  - Provides device lookup and filtering capabilities

- **Key Methods:**
  - `registerDevice(device)` - Add device to registry
  - `getDevice(deviceId)` - Retrieve device by ID
  - `setMappingInfo(deviceId, mappingInfo)` - Store mapping details
  - `recordError(deviceId, errorType)` - Track device errors
  - `shouldRefreshMapping(deviceId, currentDevice)` - Check mapping validity

### Device State Manager

The `DeviceStateManager` class (device-state-manager.js) provides reliable state management:

- **Responsibilities:**
  - Manages device capability state with validation
  - Handles error recovery and retries
  - Implements state caching for offline devices
  - Provides controlled updates with debouncing

- **Key Methods:**
  - `getState(capability)` - Retrieve validated capability state
  - `setState(capability, value)` - Update capability with validation
  - `registerValidator(capability, validator)` - Add state validation
  - `updateDeviceCapability(capability, value)` - Update with retry logic

### Capability Observer

The `CapabilityObserver` class (capability-observer.js) optimizes device subscriptions:

- **Responsibilities:**
  - Provides efficient capability monitoring
  - Implements subscription retries with exponential backoff
  - Shares subscription instances across components
  - Handles subscription timeouts gracefully

- **Key Methods:**
  - `observe(capability, callback)` - Monitor capability changes
  - `unobserve(capability, callback)` - Stop monitoring capability
  - `createCapabilityInstance(capability)` - Create subscription with retries
  - `getCurrentValue(capability)` - Get current capability value

## Mapping System

### BaseMapper

The `BaseMapper` class standardizes mapper creation:

- **Responsibilities:**
  - Provides a consistent API for defining mappers
  - Supports inheritance and composition
  - Manages capability requirements and options
  - Builds structured mapper configurations

- **Key Methods:**
  - `addRequiredCapability(name, config)` - Define required capabilities
  - `addOptionalCapability(name, config)` - Define optional capabilities
  - `extend(baseMapper)` - Inherit from another mapper
  - `build()` - Generate final mapper configuration

### Mapper Types

The system implements multiple mapper categories:

1. **Device-Specific Mappers**:
   - Tailored to specific device types (e.g., doorbell-eufy-improved.js)
   - Implement precise capability mappings for specific devices
   - Handle vendor-specific capabilities and behaviors

2. **Class-Based Mappers**:
   - Target device classes (e.g., light.js, speaker.js)
   - Implement standard mapping for typical devices
   - Support common capabilities for each device class

3. **Improved Mappers**:
   - Enhanced versions of standard mappers (e.g., light-improved.js)
   - Provide more comprehensive feature support
   - Handle edge cases and specialized features

4. **Fallback Mappers**:
   - Universal compatibility (e.g., universal-fallback.js)
   - Provide basic functionality for unmapped devices
   - Implement generic capability mappings

## Data Flow

### Device Discovery and Mapping

1. Homey device added or updated
2. HomeKitty app detects device change
3. Device-mapper evaluates suitable mappings
4. MappedDevice created with selected mapper(s)
5. Services and characteristics configured
6. Device added to HomeKit bridge

### Capability Updates

1. Homey device capability changes
2. CapabilityObserver detects change
3. MappedDevice transforms value for HomeKit
4. Characteristic updated with transformed value
5. HomeKit notified of state change

### HomeKit Commands

1. User interacts with HomeKit device
2. HomeKit sends characteristic change
3. MappedDevice receives change request
4. Value transformed for Homey compatibility
5. Homey device capability updated

## Error Handling and Recovery

The system implements multiple layers of error handling:

1. **Global Error Handling**:
   - Unhandled promise rejection handler
   - Special handling for known error patterns
   - Comprehensive error logging

2. **Subscription Recovery**:
   - Exponential backoff retry for failed subscriptions
   - Automatic recovery after network interruptions
   - Caching of last known values

3. **State Validation**:
   - Input validation for all characteristic values
   - Range checking and type validation
   - Special handling for HomeKit limitations (e.g., temperature ranges)

4. **Component Isolation**:
   - Errors in one component don't crash other components
   - Failed device mappings don't affect other devices
   - Modular design contains failures to specific subsystems

## Component Diagram

```
+-------------------+     +---------------------+
|                   |     |                     |
|   HomeKitty App   |---->|   Device Registry   |
|    (app.js)       |     |  (device-registry)  |
|                   |     |                     |
+--------+----------+     +---------+-----------+
         |                          |
         v                          v
+--------+----------+     +---------+-----------+
|                   |     |                     |
|  Device Mapper    |---->| Device State Manager|
| (device-mapper.js)|     |(device-state-manager|
|                   |     |                     |
+--------+----------+     +---------+-----------+
         |                          |
         v                          v
+--------+----------+     +---------+-----------+
|                   |     |                     |
|  Mapped Device    |<--->|Capability Observer  |
| (mapped-device.js)|     |(capability-observer)|
|                   |     |                     |
+--------+----------+     +---------------------+
         |
         v
+--------+----------+
|                   |
|    BaseMapper     |
|  (mapper-base.js) |
|                   |
+--------+----------+
         |
         v
+--------+---------------------------+
|                                    |
|           Mapper Files             |
| (doorbell-eufy-improved.js, etc.)  |
|                                    |
+------------------------------------+
```

## Configuration and Settings

The system supports various configuration options:

1. **Bridge Configuration**:
   - PIN code configuration
   - Bridge name and model customization
   - Port and username configuration

2. **Device Exposure Control**:
   - Control which devices are exposed to HomeKit
   - Default exposure settings for new devices
   - Selective device exposure

3. **Logging Configuration**:
   - Log level configuration
   - File rotation settings
   - Format customization

## Future Architectural Considerations

Planned architectural improvements:

1. **Service Composition System**:
   - More flexible service composition for complex devices
   - Dynamic service addition based on capabilities
   - Enhanced service coordination

2. **Subscription Pooling**:
   - Reduce subscription overhead for large installations
   - Share subscriptions across related components
   - Optimize subscription recovery

3. **Configuration System**:
   - Enhanced user configuration interface
   - Per-device configuration options
   - Mapper customization settings