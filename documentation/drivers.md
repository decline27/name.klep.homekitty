# Driver Implementation Architecture

## Driver Structure
```javascript
// Example from drivers/flow-starter/device.js
const VirtualDevice = require('../../drivers/virtual-device');

module.exports = class FlowStarterDevice extends VirtualDevice {
  async onInit() {
    this.registerCapabilityListener('button', this.onCapabilityButton.bind(this));
    
    // Flow card registration
    this.homey.flow.getDeviceTriggerCard('button_pressed')
      .registerRunListener(this.handleFlowTrigger.bind(this));
  }

  async onCapabilityButton(value) {
    // Sync with HomeKit
    await this.homeyAPI.setDeviceValue(this.id, 'Button', value);
    
    // Trigger flows
    this.homey.flow.getDeviceTriggerCard('button_pressed')
      .trigger(this, {}, { button: value ? 'pressed' : 'released' });
  }
};
```

## Core Components
1. **Virtual Device Base Class**  
   Provides common functionality through inheritance:
   ```javascript
   class VirtualDevice extends Homey.Device {
     async syncHomeKitState() {
       // Implementation in virtual-device.js
     }
   }
   ```

2. **Capability Mapping**  
   Drivers declare supported Homey capabilities that get mapped to HomeKit services

3. **Flow Integration**  
   Flow starters use Homey's flow engine with:
   ```javascript
   this.homey.flow.getActionCard('set_light')
     .registerRunListener(async (args) => {
       await args.device.setCapabilityValue('onoff', args.state);
     });
   ```

## Driver Types
| Driver | HomeKit Service | Capabilities | Flows |
|--------|-----------------|--------------|-------|
| Light | Lightbulb | onoff, dim | Set brightness |
| Thermostat | Thermostat | target_temperature | Set temperature |
| Flow Starter | StatelessProgrammableSwitch | button | Trigger scenes |

## Lifecycle Management
1. Initialization sequence:
   ```mermaid
   sequenceDiagram
       Device->>VirtualDevice: onInit()
       VirtualDevice->>Mapper: registerCapabilities()
       Mapper->>HomeKit: publishServices()
   ```
   
2. Error handling through overridable hooks:
   ```javascript
   async onUninit() {
     await super.onUninit();
     // Custom cleanup
   }