# HomeKitty Architectural Overview

## Core Components
```mermaid
graph TD
    A[App Entrypoint (app.js)] --> B[Device Drivers]
    A --> C[HomeKit Mappings]
    A --> D[Settings Interface]
    B --> E[Virtual Device Implementation]
    C --> F[Characteristic Converters]
    D --> G[Vue.js Components]
```

## Key Architectural Decisions
1. **Modular Mapping System**  
   HomeKit characteristics are implemented in separate files under `/lib/maps` following the pattern:
   ```javascript
   module.exports = (device, Homey) => ({
       characteristic: {
           get: (value) => convertToHomeKit(value),
           set: (value) => convertToHomey(value)
       }
   });
   ```

2. **Driver Decoupling**  
   Device drivers (`/drivers/*`) implement only Homey logic, while mappings handle HomeKit translation

3. **Centralized Accessors**  
   Shared conversion utilities in `/lib/mapper-accessors.js` ensure consistent unit conversions

4. **Mockable Settings**  
   Settings interface includes `homey-settings-mock.js` for development without physical devices

## Data Flow
1. Homey Event → Driver → Mapped Device → HomeKit Characteristic
2. HomeKit Command → Mapped Setter → Driver Method → Device Control

## Dependency Management
- HomeKit integration via `/modules/hap-nodejs`
- Homey API abstraction in `/modules/homey-api`