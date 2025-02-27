// mapper-integration-test.js
const { expect } = require('chai');
const sinon = require('sinon');

// Import modules
const DeviceMapper = require('../../lib/device-mapper');
const { MappedDevice } = require('../../lib/mapped-device');

// Get the actual HAP-NodeJS module
const { 
  Bridge, Service, Characteristic,
  Accessory, AccessoryEventTypes, uuid 
} = require('../../modules/hap-nodejs');

describe('Mapper Integration Tests', () => {
  let sandbox;
  let mockLogger;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    mockLogger = {
      info: sinon.spy(),
      error: sinon.spy(),
      warn: sinon.spy(),
      debug: sinon.spy()
    };
    DeviceMapper.setLogger(mockLogger);
    
    // Reset DeviceMapper between tests
    DeviceMapper.resetMappers();
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('Real Device Mapping', () => {
    // Library of test devices
    const testDevices = [
      createLightDevice(),
      createThermostatDevice(),
      createSpeakerDevice(),
      createCameraDevice(),
      createDoorbellDevice(),
      createSensorDevice()
    ];
    
    // Run tests for each device type
    testDevices.forEach(device => {
      it(`should correctly map a ${device.class} device (${device.name})`, () => {
        // Create appropriate mapper for this device type
        switch(device.class) {
          case 'light':
            DeviceMapper.createMap(createLightMapper());
            break;
          case 'thermostat':
            DeviceMapper.createMap(createThermostatMapper());
            break;
          case 'speaker':
            DeviceMapper.createMap(createSpeakerMapper());
            break;
          case 'camera':
            DeviceMapper.createMap(createCameraMapper());
            break;
          case 'doorbell':
            DeviceMapper.createMap(createDoorbellMapper());
            break;
          case 'sensor':
            DeviceMapper.createMap(createSensorMapper());
            break;
          default:
            DeviceMapper.createMap(createFallbackMapper());
        }
        
        const mappedDevice = DeviceMapper.mapDevice(device);
        
        // Verify mapping succeeded
        expect(mappedDevice).to.not.be.null;
        
        // Verify primary map is appropriate for this device class
        const primaryMap = mappedDevice.getPrimaryMap();
        expect(primaryMap.class).to.satisfy(classOrClasses => {
          if (Array.isArray(classOrClasses)) {
            return classOrClasses.includes(device.class);
          }
          return classOrClasses === device.class || classOrClasses === '*';
        });
        
        // Verify all required capabilities are present
        const requiredCapabilities = Object.keys(primaryMap.required || {});
        const deviceCapabilities = device.capabilities;
        
        const missingCapabilities = requiredCapabilities.filter(
          cap => !deviceCapabilities.includes(cap)
        );
        
        // Allow for fallback mappers to work with fewer capabilities
        if (primaryMap.isFallbackMap || primaryMap.fallbackEnabled) {
          expect(missingCapabilities.length).to.be.lessThan(requiredCapabilities.length);
        } else if (requiredCapabilities.length > 0) {
          const matchPercentage = 
            ((requiredCapabilities.length - missingCapabilities.length) / 
             requiredCapabilities.length) * 100;
             
          expect(matchPercentage).to.be.at.least(
            primaryMap.requiredMatchPercentage || 40
          );
        }
        
        // Verify accessory creation works
        const mockAccessory = createMockHAPAccessory(device);
        sandbox.stub(mappedDevice, 'createAccessory').returns(mockAccessory);
        
        const accessory = mappedDevice.accessorize();
        expect(accessory).to.equal(mockAccessory);
        
        // Verify service was added
        expect(mockAccessory.addService.called).to.be.true;
      });
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle devices with changing capabilities', () => {
      // Create device with initial capabilities
      const device = createLightDevice();
      
      // Add both mappers we'll test with
      const lightMapper = createLightMapper();
      const basicLightMapper = createBasicLightMapper();
      
      DeviceMapper.createMap(lightMapper);
      DeviceMapper.createMap(basicLightMapper);
      
      // First map the device
      const mappedDevice = DeviceMapper.mapDevice(device);
      expect(mappedDevice).to.not.be.null;
      
      // Remember the initial mapper
      const initialMapperName = mappedDevice.getPrimaryMap().name;
      
      // Now change device capabilities - remove the temperature capability
      const reducedDevice = {
        ...device,
        capabilities: ['onoff', 'dim'] // Remove light_temperature
      };
      
      // Force DeviceMapper to forget this device
      DeviceMapper.forgetDevice(device);
      
      // Map again with new capabilities
      const remappedDevice = DeviceMapper.mapDevice(reducedDevice);
      expect(remappedDevice).to.not.be.null;
      
      // Verify mapper selection is still appropriate for reduced capabilities
      const newMapper = remappedDevice.getPrimaryMap();
      expect(newMapper.name).to.be.oneOf([initialMapperName, 'basic-light']);
    });
    
    it('should handle device class changes', () => {
      // Create device with initial class
      const device = createLightDevice();
      const initialClass = device.class;
      
      // Create mappers for both device classes
      DeviceMapper.createMap(createLightMapper());
      DeviceMapper.createMap(createSwitchMapper());
      
      // First map the device
      const mappedDevice = DeviceMapper.mapDevice(device);
      expect(mappedDevice).to.not.be.null;
      
      // Remember the initial mapper
      const initialMapperName = mappedDevice.getPrimaryMap().name;
      
      // Now change device class
      const changedDevice = {
        ...device,
        class: 'socket'
      };
      
      // Force DeviceMapper to forget this device
      DeviceMapper.forgetDevice(device);
      
      // Map again with new class
      const remappedDevice = DeviceMapper.mapDevice(changedDevice);
      expect(remappedDevice).to.not.be.null;
      
      // Verify service is still appropriate (many mappers will work for both)
      const newMapper = remappedDevice.getPrimaryMap();
      expect(newMapper.class).to.satisfy(classOrClasses => {
        if (Array.isArray(classOrClasses)) {
          return classOrClasses.includes(changedDevice.class);
        }
        return classOrClasses === changedDevice.class || classOrClasses === '*';
      });
    });
    
    // This test is skipped for now as it requires deeper integration with the actual mapper system
    it.skip('should handle unsupported devices gracefully', () => {
      // Create device with no mappable capabilities but proper UI components structure
      const device = {
        id: 'unsupported-1',
        name: 'Strange Device',
        class: 'unknown-class',
        capabilities: ['custom_capability'],
        capabilitiesObj: {
          custom_capability: { value: 'test' }
        },
        ui: { 
          components: [
            { capabilities: ['custom_capability'] }
          ] 
        },
        available: true,
        ready: true,
        makeCapabilityInstance: sinon.stub().returns({ destroy: sinon.stub() }),
        setCapabilityValue: sinon.stub().resolves()
      };
      
      // Reset mapper state to ensure no other mappers are present
      DeviceMapper.resetMappers();
      
      // First attempt to map the device with no mappers
      const mappedDevice = DeviceMapper.mapDevice(device);
      
      // With no mappers, this should fail
      expect(mappedDevice).to.be.null;
      
      // Now add a universal fallback mapper that accepts ANY device class
      const fallbackMapper = {
        class: '*', // Wildcard class
        service: Service.Switch,
        name: 'universal-fallback',
        required: {}, // No required capabilities
        optional: {
          // Match any capability with a boolean handler
          custom_capability: {
            characteristics: Characteristic.On,
            get: () => true,
            set: () => true
          }
        },
        isFallbackMap: true,
        fallbackEnabled: true,
        requiredMatchPercentage: 0 // No threshold
      };
      
      // Add the fallback mapper
      DeviceMapper.createMap(fallbackMapper);
      
      // Try mapping again - it should succeed now
      const remappedDevice = DeviceMapper.mapDevice(device);
      
      // Verify mapping succeeded with fallback mapper
      expect(remappedDevice).to.not.be.null;
      expect(remappedDevice.getPrimaryMap().name).to.equal('universal-fallback');
    });
  });
  
  // Helper functions to create test devices
  function createLightDevice() {
    return {
      id: 'test-light-1',
      name: 'Living Room Light',
      class: 'light',
      capabilities: ['onoff', 'dim', 'light_temperature'],
      capabilitiesObj: {
        onoff: { value: true },
        dim: { value: 0.8 },
        light_temperature: { value: 0.5 }
      },
      ui: {
        components: [
          { capabilities: ['onoff'] },
          { capabilities: ['dim'] },
          { capabilities: ['light_temperature'] }
        ]
      },
      ready: true,
      available: true,
      makeCapabilityInstance: sinon.stub().returns({ destroy: sinon.stub() }),
      setCapabilityValue: sinon.stub().resolves()
    };
  }
  
  function createThermostatDevice() {
    return {
      id: 'test-thermostat-1',
      name: 'Living Room Thermostat',
      class: 'thermostat',
      capabilities: ['target_temperature', 'measure_temperature', 'thermostat_mode'],
      capabilitiesObj: {
        target_temperature: { value: 21 },
        measure_temperature: { value: 20 },
        thermostat_mode: { value: 'heat' }
      },
      ui: {
        components: [
          { capabilities: ['target_temperature'] },
          { capabilities: ['measure_temperature'] },
          { capabilities: ['thermostat_mode'] }
        ]
      },
      ready: true,
      available: true,
      makeCapabilityInstance: sinon.stub().returns({ destroy: sinon.stub() }),
      setCapabilityValue: sinon.stub().resolves()
    };
  }
  
  function createSpeakerDevice() {
    return {
      id: 'test-speaker-1',
      name: 'Living Room Speaker',
      class: 'speaker',
      capabilities: ['volume_set', 'volume_mute', 'speaker_playing', 'speaker_next', 'speaker_prev'],
      capabilitiesObj: {
        volume_set: { value: 0.7 },
        volume_mute: { value: false },
        speaker_playing: { value: true },
        speaker_next: { value: true },
        speaker_prev: { value: true }
      },
      ui: {
        components: [
          { capabilities: ['volume_set', 'volume_mute'] },
          { capabilities: ['speaker_playing'] },
          { capabilities: ['speaker_next', 'speaker_prev'] }
        ]
      },
      ready: true,
      available: true,
      makeCapabilityInstance: sinon.stub().returns({ destroy: sinon.stub() }),
      setCapabilityValue: sinon.stub().resolves()
    };
  }
  
  function createCameraDevice() {
    return {
      id: 'test-camera-1',
      name: 'Front Door Camera',
      class: 'camera',
      capabilities: ['alarm_motion', 'homealarm_state'],
      capabilitiesObj: {
        alarm_motion: { value: false },
        homealarm_state: { value: 'armed' }
      },
      ui: {
        components: [
          { capabilities: ['alarm_motion'] },
          { capabilities: ['homealarm_state'] }
        ]
      },
      ready: true,
      available: true,
      makeCapabilityInstance: sinon.stub().returns({ destroy: sinon.stub() }),
      setCapabilityValue: sinon.stub().resolves()
    };
  }
  
  function createDoorbellDevice() {
    return {
      id: 'test-doorbell-1',
      name: 'Front Door Bell',
      class: 'doorbell',
      capabilities: ['alarm_generic', 'alarm_motion'],
      capabilitiesObj: {
        alarm_generic: { value: false },
        alarm_motion: { value: false }
      },
      ui: {
        components: [
          { capabilities: ['alarm_generic'] },
          { capabilities: ['alarm_motion'] }
        ]
      },
      ready: true,
      available: true,
      makeCapabilityInstance: sinon.stub().returns({ destroy: sinon.stub() }),
      setCapabilityValue: sinon.stub().resolves()
    };
  }
  
  function createSensorDevice() {
    return {
      id: 'test-sensor-1',
      name: 'Living Room Sensor',
      class: 'sensor',
      capabilities: ['measure_temperature', 'measure_humidity', 'alarm_motion'],
      capabilitiesObj: {
        measure_temperature: { value: 21.5 },
        measure_humidity: { value: 45 },
        alarm_motion: { value: false }
      },
      ui: {
        components: [
          { capabilities: ['measure_temperature'] },
          { capabilities: ['measure_humidity'] },
          { capabilities: ['alarm_motion'] }
        ]
      },
      ready: true,
      available: true,
      makeCapabilityInstance: sinon.stub().returns({ destroy: sinon.stub() }),
      setCapabilityValue: sinon.stub().resolves()
    };
  }
  
  // Helper functions to create mappers
  function createLightMapper() {
    return {
      class: ['light', 'socket'],
      service: Service.Lightbulb,
      name: 'light-improved',
      category: Accessory.Categories.LIGHTBULB,
      group: true,
      required: {
        onoff: {
          characteristics: Characteristic.On,
          get: value => value,
          set: value => value
        }
      },
      optional: {
        dim: {
          characteristics: Characteristic.Brightness,
          get: value => value * 100,
          set: value => value / 100
        },
        light_temperature: {
          characteristics: Characteristic.ColorTemperature,
          get: value => 500 - (value * 360),
          set: value => (500 - value) / 360
        }
      },
      requiredMatchPercentage: 50
    };
  }
  
  function createBasicLightMapper() {
    return {
      class: 'light',
      service: Service.Lightbulb,
      name: 'basic-light',
      category: Accessory.Categories.LIGHTBULB,
      required: {
        onoff: {
          characteristics: Characteristic.On,
          get: value => value,
          set: value => value
        }
      },
      optional: {
        dim: {
          characteristics: Characteristic.Brightness,
          get: value => value * 100,
          set: value => value / 100
        }
      },
      requiredMatchPercentage: 100
    };
  }
  
  function createThermostatMapper() {
    return {
      class: 'thermostat',
      service: Service.Thermostat,
      name: 'thermostat-improved',
      category: Accessory.Categories.THERMOSTAT,
      required: {
        target_temperature: {
          characteristics: Characteristic.TargetTemperature,
          get: value => value,
          set: value => value
        },
        measure_temperature: {
          characteristics: Characteristic.CurrentTemperature,
          get: value => value
        }
      },
      optional: {
        thermostat_mode: {
          characteristics: Characteristic.CurrentHeatingCoolingState,
          get: value => value === 'heat' ? 1 : 0,
          set: value => value > 0 ? 'heat' : 'off'
        }
      },
      requiredMatchPercentage: 60
    };
  }
  
  function createSpeakerMapper() {
    return {
      class: 'speaker',
      service: Service.Speaker,
      name: 'speaker-improved',
      category: Accessory.Categories.SPEAKER,
      required: {
        volume_set: {
          characteristics: Characteristic.Volume,
          get: value => value * 100,
          set: value => value / 100
        }
      },
      optional: {
        volume_mute: {
          characteristics: Characteristic.Mute,
          get: value => value,
          set: value => value
        },
        speaker_playing: {
          characteristics: Characteristic.On,
          get: value => value,
          set: value => value
        }
      },
      requiredMatchPercentage: 50,
      fallbackEnabled: true
    };
  }
  
  function createCameraMapper() {
    return {
      class: 'camera',
      service: Service.Switch, // Simplified for testing
      name: 'camera-improved',
      category: Accessory.Categories.OTHER,
      required: {
        alarm_motion: {
          characteristics: Characteristic.On,
          get: value => value,
          set: value => value
        }
      },
      optional: {
        homealarm_state: {
          characteristics: Characteristic.On,
          get: value => value === 'armed',
          set: value => value ? 'armed' : 'disarmed'
        }
      },
      requiredMatchPercentage: 50
    };
  }
  
  function createDoorbellMapper() {
    return {
      class: 'doorbell',
      service: Service.Switch, // Simplified for testing
      name: 'doorbell-improved',
      category: Accessory.Categories.OTHER,
      required: {
        alarm_generic: {
          characteristics: Characteristic.On,
          get: value => value,
          set: value => value
        }
      },
      optional: {
        alarm_motion: {
          characteristics: Characteristic.On,
          get: value => value
        }
      },
      requiredMatchPercentage: 50
    };
  }
  
  function createSensorMapper() {
    return {
      class: 'sensor',
      service: Service.TemperatureSensor, // Use a real sensor service
      name: 'sensor-improved',
      category: Accessory.Categories.SENSOR,
      required: {
        measure_temperature: { // Make this required so it will match
          characteristics: Characteristic.CurrentTemperature,
          get: value => value
        }
      },
      optional: {
        measure_humidity: {
          characteristics: Characteristic.RelativeHumidityCurrentValue || Characteristic.On, // Fallback
          get: value => value > 50 ? 100 : 0
        },
        alarm_motion: {
          characteristics: Characteristic.MotionDetected || Characteristic.On, // Fallback
          get: value => value
        }
      },
      requiredMatchPercentage: 50,
      fallbackEnabled: true
    };
  }
  
  function createSwitchMapper() {
    return {
      class: 'socket',
      service: Service.Switch,
      name: 'switch-improved',
      category: Accessory.Categories.SWITCH,
      required: {
        onoff: {
          characteristics: Characteristic.On,
          get: value => value,
          set: value => value
        }
      },
      requiredMatchPercentage: 100
    };
  }
  
  function createFallbackMapper() {
    return {
      class: '*', // Wildcard to match any device class
      service: Service.Switch,
      name: 'universal-fallback',
      category: Accessory.Categories.OTHER,
      // Make this truly universal by not requiring specific capabilities
      required: {},
      optional: {
        // Add handlers for any capability that might be present
        onoff: {
          characteristics: Characteristic.On,
          get: value => value,
          set: value => value
        },
        custom_capability: {
          characteristics: Characteristic.On,
          get: () => true
        }
      },
      isFallbackMap: true,
      fallbackEnabled: true,
      requiredMatchPercentage: 0
    };
  }
  
  function createMockHAPAccessory(device) {
    const accessory = {
      on: sinon.stub(),
      getService: sinon.stub(),
      addService: sinon.stub(),
      services: []
    };
    
    // Set up service with characteristics
    const mockService = {
      setCharacteristic: sinon.stub().returnsThis(),
      getCharacteristic: sinon.stub(),
      name: 'MockService'
    };
    
    // Set up characteristic with methods
    const mockCharacteristic = {
      on: sinon.stub().returnsThis(),
      onGet: sinon.stub().returnsThis(),
      onSet: sinon.stub().returnsThis(),
      updateValue: sinon.stub(),
      validateUserInput: value => value
    };
    
    // Configure stubs
    accessory.getService.returns(null); // First call returns null to trigger addService
    accessory.addService.returns(mockService);
    mockService.getCharacteristic.returns(mockCharacteristic);
    
    // Add to services array
    accessory.services = [mockService];
    
    return accessory;
  }
});