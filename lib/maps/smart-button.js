const BaseMapper = require('../mapper-base');

/**
 * Map button devices with click capabilities to HomeKit
 * This handles devices with click, dclick, and hclick capabilities
 */
module.exports = (Mapper, Service, Characteristic, Accessory) => {
  const smartButtonMapper = new BaseMapper(
    // Match button device class
    'button',
    // Use stateless programmable switch as it's most appropriate for button devices
    Service.StatelessProgrammableSwitch,
    {
      // Configuration options
      name: 'Smart Button',
      requiredMatchPercentage: 60, // Moderate threshold for button devices
      onService: (service, { device }) => {
        // Add a descriptive name
        service.setCharacteristic(
          Characteristic.Name, 
          `${device.name} Button`
        );
        
        // Configure supported button events
        // Values: 0=SINGLE_PRESS, 1=DOUBLE_PRESS, 2=LONG_PRESS
        service.setCharacteristic(
          Characteristic.ServiceLabelIndex,
          1
        );
      },
      // Use appropriate accessory category
      category: Accessory.Categories.PROGRAMMABLE_SWITCH
    }
  );

  // Required capabilities - any of these will make the mapper applicable
  smartButtonMapper.addRequiredCapability('click', {
    characteristics: Characteristic.ProgrammableSwitchEvent,
    get: () => null, // No state is maintained
    set: async (value, { device, service, characteristic }) => {
      if (value === true) {
        // Single press = 0
        service.getCharacteristic(characteristic).updateValue(0);
        
        // Auto reset after a short delay
        setTimeout(() => {
          service.getCharacteristic(characteristic).updateValue(null);
        }, 300);
        return true;
      }
      return null;
    },
    triggers: [{
      on: 'capability',
      capability: 'click',
      handler: async ({ device, service, characteristic }) => {
        // Single press = 0
        service.getCharacteristic(characteristic).updateValue(0);
        
        // Auto reset after a short delay
        setTimeout(() => {
          service.getCharacteristic(characteristic).updateValue(null);
        }, 300);
      }
    }]
  });
  
  // Double-click support
  smartButtonMapper.addOptionalCapability('dclick', {
    // No characteristics defined - we'll use triggers
    triggers: [{
      on: 'capability',
      capability: 'dclick',
      handler: async ({ device, service }) => {
        // Double press = 1
        service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(1);
        
        // Auto reset after a short delay
        setTimeout(() => {
          service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(null);
        }, 300);
      }
    }]
  });
  
  // Long-press support
  smartButtonMapper.addOptionalCapability('hclick', {
    // No characteristics defined - we'll use triggers
    triggers: [{
      on: 'capability',
      capability: 'hclick',
      handler: async ({ device, service }) => {
        // Long press = 2
        service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(2);
        
        // Auto reset after a short delay
        setTimeout(() => {
          service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(null);
        }, 300);
      }
    }]
  });
  
  // Battery support
  smartButtonMapper.addOptionalCapability('measure_battery', 
    BaseMapper.CapabilityMapper.batteryLevel());
  
  // Return the built mapper
  return smartButtonMapper.build();
};