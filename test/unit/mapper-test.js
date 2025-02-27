const { expect } = require('chai');  // We'll need to add chai as a dev dependency
const sinon = require('sinon');      // And sinon for mocking

// Import the modules to test
const DeviceMapper = require('../../lib/device-mapper');
const MappedDevice = require('../../lib/mapped-device').MappedDevice;
const BaseMapper = require('../../lib/mapper-base');

// Get the actual HAP-NodeJS module
const { 
  Bridge, Service, Characteristic,
  Accessory, AccessoryEventTypes, uuid 
} = require('../../modules/hap-nodejs');

// Mock logger implementation
const mockLogger = {
  info: sinon.spy(),
  error: sinon.spy(),
  warn: sinon.spy(),
  debug: sinon.spy(),
  logCapability: sinon.spy(),
  logService: sinon.spy()
};

describe('Device Mapper System', () => {
  let sandbox;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Reset the mapper state
    DeviceMapper.setLogger(mockLogger);
    
    // Reset logger spies
    mockLogger.info.resetHistory();
    mockLogger.error.resetHistory();
    mockLogger.warn.resetHistory();
    mockLogger.debug.resetHistory();
    
    // Reset DeviceMapper (can be affected by previous tests)
    DeviceMapper.resetMappers();
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('Mapper Selection', () => {
    it('should select the correct mapper for a light device', () => {
      // Create a mock light device
      const mockDevice = createMockDevice({
        id: 'light-1',
        name: 'Living Room Light',
        class: 'light',
        capabilities: ['onoff', 'dim', 'light_temperature'],
        capabilitiesObj: {
          onoff: { value: true },
          dim: { value: 0.8 },
          light_temperature: { value: 0.5 }
        }
      });
      
      // Create a light mapper
      const lightMapper = createLightMapper();
      DeviceMapper.createMap(lightMapper);
      
      // Map the device
      const mappedDevice = DeviceMapper.mapDevice(mockDevice);
      
      // Verify the correct mapper was selected
      expect(mappedDevice).to.not.be.null;
      expect(mappedDevice.getPrimaryMap().name).to.equal('light-improved');
    });
    
    it('should prioritize mappers with higher capability match percentage', () => {
      // Create mock device with onoff and dim but not temperature
      const mockDevice = createMockDevice({
        id: 'light-2',
        name: 'Bedroom Light',
        class: 'light',
        capabilities: ['onoff', 'dim'],
        capabilitiesObj: {
          onoff: { value: true },
          dim: { value: 0.7 }
        }
      });
      
      // Create two mappers with different requirements
      const basicLightMapper = createBasicLightMapper();
      const fullLightMapper = createLightMapper();
      
      DeviceMapper.createMap(basicLightMapper);
      DeviceMapper.createMap(fullLightMapper);
      
      // Map the device
      const mappedDevice = DeviceMapper.mapDevice(mockDevice);
      
      // Verify the mapper with higher match percentage was selected
      expect(mappedDevice).to.not.be.null;
      expect(mappedDevice.getPrimaryMap().name).to.equal('basic-light');
    });
    
    it('should fallback to universal-fallback for unknown device types', () => {
      // Create mock device with unknown class
      const mockDevice = createMockDevice({
        id: 'unknown-1',
        name: 'Unknown Device',
        class: 'unknown-class',
        capabilities: ['onoff'],
        capabilitiesObj: {
          onoff: { value: true }
        }
      });
      
      // Create a fallback mapper
      const fallbackMapper = createFallbackMapper();
      DeviceMapper.createMap(fallbackMapper);
      
      // Map the device
      const mappedDevice = DeviceMapper.mapDevice(mockDevice);
      
      // Verify fallback mapper was selected
      expect(mappedDevice).to.not.be.null;
      expect(mappedDevice.getPrimaryMap().name).to.equal('universal-fallback');
    });
    
    it('should prefer improved mappers over legacy mappers', () => {
      // Create a mock light device
      const mockDevice = createMockDevice({
        id: 'light-3',
        name: 'Kitchen Light',
        class: 'light',
        capabilities: ['onoff', 'dim'],
        capabilitiesObj: {
          onoff: { value: true },
          dim: { value: 0.6 }
        }
      });
      
      // Create both legacy and improved mappers with clear naming to prioritize improved one
      const legacyMapper = createLegacyLightMapper();
      const improvedMapper = {
        class: 'light',
        service: Service.Lightbulb,
        name: 'light-improved', // Make sure the name clearly indicates this is improved
        category: Accessory.Categories.LIGHTBULB,
        isFallbackMap: false,  // Explicitly set this for test clarity
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
        // Setting a higher match percentage to ensure this is chosen
        requiredMatchPercentage: 40
      };
      
      // Order matters - add improved last so it's found first in the sorting
      DeviceMapper.createMap(legacyMapper);
      DeviceMapper.createMap(improvedMapper);
      
      // Map the device
      const mappedDevice = DeviceMapper.mapDevice(mockDevice);
      
      // Verify improved mapper was selected
      expect(mappedDevice).to.not.be.null;
      expect(mappedDevice.getPrimaryMap().name).to.equal('light-improved');
    });
  });
  
  describe('Capability Matching', () => {
    it('should correctly calculate capability match percentage', () => {
      // Create a device with only some capabilities
      const mockDevice = createMockDevice({
        id: 'thermostat-1',
        name: 'Living Room Thermostat',
        class: 'thermostat',
        capabilities: ['target_temperature', 'measure_temperature'],
        capabilitiesObj: {
          target_temperature: { value: 21 },
          measure_temperature: { value: 20 }
        }
      });
      
      // Create a thermostat mapper that requires additional capabilities
      const thermostatMapper = createThermostatMapper();
      DeviceMapper.createMap(thermostatMapper);
      
      // Map the device
      const mappedDevice = DeviceMapper.mapDevice(mockDevice);
      
      // Verify logger was called with correct match percentage
      const matchPercentageCalls = mockLogger.debug.getCalls().filter(
        call => call.args.some(arg => typeof arg === 'string' && arg.includes('Match percentage'))
      );
      
      expect(matchPercentageCalls.length).to.be.greaterThan(0);
      const matchLog = matchPercentageCalls[0].args.find(arg => typeof arg === 'string' && arg.includes('Match percentage'));
      
      // Should show 66.67% (2 out of 3 required capabilities)
      expect(matchLog).to.include('66.67%');
    });
    
    it('should respect requiredMatchPercentage threshold', () => {
      // Create a device with limited capabilities
      const mockDevice = createMockDevice({
        id: 'speaker-1',
        name: 'Living Room Speaker',
        class: 'speaker',
        capabilities: ['volume_set'],
        capabilitiesObj: {
          volume_set: { value: 0.5 }
        }
      });
      
      // Create a speaker mapper with high requirements
      const speakerMapper = createSpeakerMapper({ requiredMatchPercentage: 80 });
      DeviceMapper.createMap(speakerMapper);
      
      // Attempt to map the device
      const mappedDevice = DeviceMapper.mapDevice(mockDevice);
      
      // Verify mapping failed due to insufficient match percentage
      expect(mappedDevice).to.be.null;
    });
    
    it('should use fallback threshold for fallback-enabled mappers', () => {
      // Create a device with limited capabilities
      const mockDevice = createMockDevice({
        id: 'speaker-2',
        name: 'Kitchen Speaker',
        class: 'speaker',
        capabilities: ['volume_set'],
        capabilitiesObj: {
          volume_set: { value: 0.5 }
        }
      });
      
      // Create a speaker mapper with fallback enabled
      const speakerMapper = createSpeakerMapper({ 
        requiredMatchPercentage: 80,
        fallbackEnabled: true
      });
      DeviceMapper.createMap(speakerMapper);
      
      // Map the device
      const mappedDevice = DeviceMapper.mapDevice(mockDevice);
      
      // Verify mapping succeeded despite low match percentage due to fallback
      expect(mappedDevice).to.not.be.null;
    });
  });
  
  describe('Service Creation', () => {
    it('should create the correct HomeKit services for a mapped device', () => {
      // Create a mock light device
      const mockDevice = createMockDevice({
        id: 'light-4',
        name: 'Office Light',
        class: 'light',
        capabilities: ['onoff', 'dim', 'light_temperature'],
        capabilitiesObj: {
          onoff: { value: true },
          dim: { value: 0.8 },
          light_temperature: { value: 0.5 }
        }
      });
      
      // Create a light mapper
      const lightMapper = createLightMapper();
      DeviceMapper.createMap(lightMapper);
      
      // Create mock accessory for testing
      const mockAccessory = createMockAccessory();
      sandbox.stub(MappedDevice.prototype, 'createAccessory').returns(mockAccessory);
      
      // Map the device
      const mappedDevice = DeviceMapper.mapDevice(mockDevice);
      
      // Verify service creation is triggered
      const accessory = mappedDevice.accessorize();
      
      // Check service was added
      expect(mockAccessory.addService.calledOnce).to.be.true;
      expect(mockAccessory.addService.firstCall.args[0]).to.equal(Service.Lightbulb);
    });
    
    it('should handle multiple services for combined devices', () => {
      // Create a mock device with multiple functions
      const mockDevice = createMockDevice({
        id: 'combo-1',
        name: 'Smart Combo Device',
        class: 'socket',
        capabilities: ['onoff', 'dim', 'speaker_playing', 'volume_set'],
        capabilitiesObj: {
          onoff: { value: true },
          dim: { value: 0.8 },
          speaker_playing: { value: false },
          volume_set: { value: 0.5 }
        }
      });
      
      // Create light and speaker mappers that won't conflict
      const lightMapper = {
        class: 'socket',
        service: Service.Lightbulb,
        name: 'socket-light',
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
        }
      };
      
      const speakerMapper = {
        class: 'socket',
        service: Service.Speaker,
        name: 'socket-speaker',
        category: Accessory.Categories.SPEAKER,
        required: {
          volume_set: {
            characteristics: Characteristic.Volume,
            get: value => value * 100,
            set: value => value / 100
          }
        },
        optional: {
          speaker_playing: {
            characteristics: Characteristic.On,
            get: value => value,
            set: value => value
          }
        }
      };
      
      DeviceMapper.resetMappers(); // Ensure clean state
      DeviceMapper.createMap(lightMapper);
      DeviceMapper.createMap(speakerMapper);
      
      // Create mock accessory for testing with both services available
      const mockAccessory = createMockAccessory();
      
      // Configure mock accessory's getService to return null first time (to trigger addService)
      // but return a mock service for subsequent calls to avoid duplicate services
      let callCount = 0;
      mockAccessory.getService = sinon.stub().callsFake((service) => {
        callCount++;
        if (callCount === 1 || callCount === 2) {
          return null; // Return null for first and second call to trigger addService
        }
        return {
          setCharacteristic: sinon.stub().returnsThis(),
          getCharacteristic: sinon.stub().returns({
            on: sinon.stub().returnsThis(),
            onGet: sinon.stub().returnsThis(),
            onSet: sinon.stub().returnsThis(),
            updateValue: sinon.stub(),
            validateUserInput: value => value
          })
        };
      });
      
      sandbox.stub(MappedDevice.prototype, 'createAccessory').returns(mockAccessory);
      
      // Map the device
      const mappedDevice = DeviceMapper.mapDevice(mockDevice);
      expect(mappedDevice).to.not.be.null;
      
      // Verify service creation
      const accessory = mappedDevice.accessorize();
      
      // Should create both services
      expect(mockAccessory.addService.calledTwice).to.be.true;
      const serviceTypes = mockAccessory.addService.getCalls().map(call => call.args[0]);
      expect(serviceTypes).to.include(Service.Lightbulb);
      expect(serviceTypes).to.include(Service.Speaker);
    });
    
    it('should avoid duplicate services', () => {
      // Create a device with capabilities that could map to duplicate services
      const mockDevice = createMockDevice({
        id: 'switch-1',
        name: 'Smart Switch',
        class: 'socket',
        capabilities: ['onoff', 'measure_power'],
        capabilitiesObj: {
          onoff: { value: true },
          measure_power: { value: 10 }
        }
      });
      
      // Create two mappers that both map to Switch service
      const switchMapper = {
        class: 'socket',
        service: Service.Switch,
        name: 'switch-primary',
        category: Accessory.Categories.SWITCH,
        required: {
          onoff: {
            characteristics: Characteristic.On,
            get: value => value,
            set: value => value
          }
        }
      };
      
      const powerSwitchMapper = {
        class: 'socket',
        service: Service.Switch, // Same service type as above
        name: 'power-switch',
        category: Accessory.Categories.SWITCH,
        required: {
          measure_power: {
            characteristics: Characteristic.On,
            get: value => value > 0
          }
        }
      };
      
      DeviceMapper.resetMappers(); // Ensure clean state
      DeviceMapper.createMap(switchMapper);
      DeviceMapper.createMap(powerSwitchMapper);
      
      // Create mock accessory for testing
      const mockAccessory = createMockAccessory();
      
      // Important: Set up the getService stub to first return null (to add service)
      // Then return a mock service on subsequent calls to avoid duplicates
      let callCount = 0;
      mockAccessory.getService = sinon.stub().callsFake((service) => {
        callCount++;
        if (callCount === 1) {
          return null; // First time return null to trigger addService
        }
        // For subsequent calls, return a service to prevent duplicate services
        return {
          setCharacteristic: sinon.stub().returnsThis(),
          getCharacteristic: sinon.stub().returns({
            on: sinon.stub().returnsThis(),
            onGet: sinon.stub().returnsThis(),
            onSet: sinon.stub().returnsThis(),
            updateValue: sinon.stub(),
            validateUserInput: value => value
          })
        };
      });
      
      sandbox.stub(MappedDevice.prototype, 'createAccessory').returns(mockAccessory);
      
      // Map the device
      const mappedDevice = DeviceMapper.mapDevice(mockDevice);
      expect(mappedDevice).to.not.be.null;
      
      // Verify service creation
      const accessory = mappedDevice.accessorize();
      
      // Should only create one service (avoid duplicates)
      expect(mockAccessory.addService.calledOnce).to.be.true;
    });
  });
  
  // Helper functions to create test objects
  
  function createMockDevice(props) {
    return {
      id: 'test-device',
      name: 'Test Device',
      class: 'unknown',
      capabilities: [],
      capabilitiesObj: {},
      ui: {
        components: [
          { capabilities: props.capabilities || [] }
        ]
      },
      ready: true,
      available: true,
      makeCapabilityInstance: () => ({ destroy: () => {} }),
      setCapabilityValue: () => Promise.resolve(),
      ...props
    };
  }
  
  function createMockAccessory() {
    const accessory = {
      on: sinon.stub(),
      getService: sinon.stub(),
      addService: sinon.stub()
    };
    
    // Setup getService to return a service with getCharacteristic
    const mockService = {
      setCharacteristic: sinon.stub().returnsThis(),
      getCharacteristic: sinon.stub()
    };
    
    // Setup getCharacteristic to return a characteristic with event methods
    const mockCharacteristic = {
      on: sinon.stub().returnsThis(),
      onGet: sinon.stub().returnsThis(),
      onSet: sinon.stub().returnsThis(),
      updateValue: sinon.stub(),
      validateUserInput: value => value
    };
    
    accessory.getService.returns(mockService);
    mockService.getCharacteristic.returns(mockCharacteristic);
    accessory.addService.returns(mockService);
    
    return accessory;
  }
  
  function createLightMapper() {
    return {
      class: 'light',
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
  
  function createLegacyLightMapper() {
    return {
      class: 'light',
      service: Service.Lightbulb,
      name: 'light',
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
      }
    };
  }
  
  function createThermostatMapper() {
    return {
      class: 'thermostat',
      service: Service.Thermostat,
      name: 'thermostat',
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
        },
        thermostat_mode: {
          characteristics: Characteristic.CurrentHeatingCoolingState,
          get: value => value === 'heat' ? 1 : 0,
          set: value => value > 0 ? 'heat' : 'off'
        }
      },
      requiredMatchPercentage: 60
    };
  }
  
  function createSpeakerMapper(options = {}) {
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
        },
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
      requiredMatchPercentage: options.requiredMatchPercentage || 50,
      fallbackEnabled: options.fallbackEnabled || false
    };
  }
  
  function createSwitchMapper() {
    return {
      class: 'socket',
      service: Service.Switch,
      name: 'switch',
      category: Accessory.Categories.SWITCH,
      required: {
        onoff: {
          characteristics: Characteristic.On,
          get: value => value,
          set: value => value
        }
      }
    };
  }
  
  function createPowerSwitchMapper() {
    return {
      class: 'socket',
      service: Service.Switch,
      name: 'power-switch',
      category: Accessory.Categories.SWITCH,
      required: {
        measure_power: {
          characteristics: Characteristic.On,
          get: value => value > 0
        }
      }
    };
  }
  
  function createFallbackMapper() {
    return {
      class: '*',
      service: Service.Switch,
      name: 'universal-fallback',
      category: Accessory.Categories.OTHER,
      required: {
        onoff: {
          characteristics: Characteristic.On,
          get: value => value,
          set: value => value
        }
      },
      isFallbackMap: true,
      fallbackEnabled: true,
      requiredMatchPercentage: 25
    };
  }
});