# HomeKit Device Mapping

This directory contains device mappers that define how Homey devices are mapped to HomeKit accessories.

## New Mapper System

The new mapping system is more flexible and reusable, making it easier to support a wide range of devices. Key features:

### BaseMapper

The `BaseMapper` class provides a fluent interface for creating device mappers:

```javascript
const BaseMapper = require('../mapper-base');

module.exports = (Mapper, Service, Characteristic, Accessory) => {
  const thermostatMapper = new BaseMapper(
    'thermostat',
    Service.Thermostat,
    {
      requiredMatchPercentage: 50,
      name: 'Improved Thermostat'
    }
  )
  .addRequiredCapability('measure_temperature', 
    BaseMapper.CapabilityMapper.temperatureSensor())
  .addRequiredCapability('target_temperature', {
    characteristics: Characteristic.TargetTemperature,
    get: (value) => BaseMapper.ValueConverter.temperature(value),
    set: (value) => value
  })
  .build();
  
  return thermostatMapper;
};
```

### Capability Reuse

Common capabilities can be reused across devices:

```javascript
// Reuse standard capability mappers
mapper.addRequiredCapability('onoff', BaseMapper.CapabilityMapper.onOff());
mapper.addOptionalCapability('dim', BaseMapper.CapabilityMapper.dim());
mapper.addOptionalCapability('measure_temperature', BaseMapper.CapabilityMapper.temperatureSensor());
```

### Mapper Inheritance

Mappers can extend each other to inherit capabilities:

```javascript
// Create a base light mapper
const baseLightMapper = new BaseMapper(
  'light',
  Service.Lightbulb
)
.addRequiredCapability('onoff', BaseMapper.CapabilityMapper.onOff());

// Create an extended light mapper with dimming
const dimmableLightMapper = new BaseMapper(
  'dimmable_light',
  Service.Lightbulb
)
.extend(baseLightMapper)
.addRequiredCapability('dim', BaseMapper.CapabilityMapper.dim())
.build();
```

### Fallback Mapping

The system supports flexible fallback mapping:

- `requiredMatchPercentage`: Define the percentage of capabilities that must match (default: 40%)
- `fallbackEnabled`: Enable fallback mode for more flexible matching
- `isFallbackMap`: Identify maps that are designed as fallbacks

### Value Conversion

The `ValueConverter` utility provides standard conversions:

```javascript
// Convert 0-1 to 0-100 for HomeKit
const percentage = BaseMapper.ValueConverter.percentage(value);

// Convert temperature with safety fallback
const temperature = BaseMapper.ValueConverter.temperature(value, 20);

// Map ranges
const mapped = BaseMapper.ValueConverter.mapRange(value, 0, 1, 140, 500);
```

## Best Practices

1. Use `BaseMapper` for all new mappings
2. Reuse capability mappers from `CapabilityMapper` when possible
3. Use value converters to ensure correct data types
4. Create specialized mappers for specific device types
5. Create fallback mappers for devices with limited capabilities

Refer to existing mappers like `light-improved.js` and `universal-fallback.js` for examples.