const { createMapping, MapperUtils } = require('../mapper-helper');

module.exports = (Mapper, Service, Characteristic) => {
  return createMapping({
    class: ['heatpump', 'thermostat'],
    service: [
      Service.Thermostat,  // Primary thermostat service
      Service.TemperatureSensor,  // Additional temperature sensors
      Service.HeaterCooler  // Flexible heating/cooling control
    ],
    required: {
      measure_temperature: {
        characteristics: Characteristic.CurrentTemperature,
        get: (value, { device }) => {
          return MapperUtils.getSafeValue('temperature', value, {
            defaultValue: 20  // Default to 20°C
          });
        }
      },
      target_temperature: {
        characteristics: Characteristic.TargetTemperature,
        get: (value, { device }) => {
          return MapperUtils.getSafeValue('temperature', value, {
            defaultValue: 22  // Default to 22°C
          });
        }
      },
      onoff: {
        characteristics: Characteristic.On,
        get: (value, { device }) => {
          return MapperUtils.getSafeValue('boolean', value);
        }
      }
    },
    optional: {
      // Multiple temperature zones
      'measure_temperature.outdoor': {
        characteristics: Characteristic.CurrentTemperature,
        get: (value, { device }) => {
          return MapperUtils.getSafeValue('temperature', value, {
            defaultValue: 15  // Default outdoor temperature
          });
        }
      },
      'measure_temperature.flow': {
        characteristics: Characteristic.CurrentTemperature,
        get: (value, { device }) => {
          return MapperUtils.getSafeValue('temperature', value, {
            defaultValue: 20  // Default flow temperature
          });
        }
      },
      'measure_temperature.return': {
        characteristics: Characteristic.CurrentTemperature,
        get: (value, { device }) => {
          return MapperUtils.getSafeValue('temperature', value, {
            defaultValue: 18  // Default return temperature
          });
        }
      },
      'measure_temperature.tank_water': {
        characteristics: Characteristic.CurrentTemperature,
        get: (value, { device }) => {
          return MapperUtils.getSafeValue('temperature', value, {
            defaultValue: 50  // Default tank water temperature
          });
        }
      },
      
      // Operational modes
      thermostat_mode: {
        characteristics: Characteristic.TargetHeatingCoolingState,
        get: (value, { device }) => {
          return MapperUtils.getSafeValue('heatingCoolingState', value);
        }
      },
      hot_water_mode: {
        characteristics: Characteristic.TargetHeatingCoolingState,
        get: (value, { device }) => {
          return value 
            ? Characteristic.TargetHeatingCoolingState.HEAT 
            : Characteristic.TargetHeatingCoolingState.OFF;
        }
      },
      
      // Operational states
      operational_state: {
        characteristics: Characteristic.CurrentHeatingCoolingState,
        get: (value, { device }) => {
          // Map operational states to HomeKit states
          const stateMap = {
            'heating': Characteristic.CurrentHeatingCoolingState.HEAT,
            'cooling': Characteristic.CurrentHeatingCoolingState.COOL,
            'idle': Characteristic.CurrentHeatingCoolingState.OFF
          };
          return stateMap[value] || Characteristic.CurrentHeatingCoolingState.OFF;
        }
      },
      
      // Power and energy monitoring
      measure_power: {
        characteristics: Characteristic.CurrentPowerConsumption,
        get: (value, { device }) => {
          return Math.max(Number(value) || 0, 0);
        }
      },
      
      // Alarm characteristics
      'alarm_generic.booster_heater1': {
        characteristics: Characteristic.StatusFault,
        get: (value, { device }) => {
          return value ? 1 : 0;  // 1 indicates fault
        }
      }
    },
    
    // Service configuration
    onService: (service, { device }) => {
      service.setPrimaryService(true);
      service.setCharacteristic(
        Characteristic.Name, 
        device.name || 'Heatpump'
      );
    }
  });
};