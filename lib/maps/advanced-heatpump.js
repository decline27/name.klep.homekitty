const { createMapping, MapperUtils } = require('../mapper-helper');
const Logger = require('../logger');

module.exports = (Mapper, Service, Characteristic, Accessory) => {
  // Logging function to track mapping decisions
  const logMappingDecision = (capability, supported, reason = '') => {
    Logger.info(`[Heatpump/Boiler Mapping] Capability: ${capability} - ${supported ? 'Mapped' : 'Skipped'}${reason ? ` (${reason})` : ''}`);
  };

  return {
    name: 'Advanced Heatpump/Boiler',
    class: ['heatpump', 'thermostat', 'boiler'],
    service: Service.Thermostat,
    category: Accessory.Categories.THERMOSTAT,  // Explicitly set category
    
    // Dynamically generate additional services based on available capabilities
    additionalServices: [
      {
        when: (device) => device.capabilitiesObj?.['measure_power'] !== undefined,
        service: Service.EnergyMeter,
        characteristics: {
          'measure_power': {
            characteristics: Characteristic.CurrentPowerConsumption,
            get: (value, { device }) => {
              logMappingDecision('measure_power', true, 'Energy Meter Service');
              return Math.max(Number(value) || 0, 0);
            }
          }
        }
      },
      {
        when: (device) => device.capabilitiesObj?.['alarm_generic.booster_heater1'] !== undefined,
        service: Service.AccessoryInformation,
        characteristics: {
          'alarm_generic.booster_heater1': {
            characteristics: Characteristic.StatusFault,
            get: (value, { device }) => {
              logMappingDecision('alarm_generic.booster_heater1', true, 'Fault Status');
              return value ? 1 : 0;  // 1 indicates fault
            }
          }
        }
      }
    ],
    
    // Required characteristics for Thermostat service
    required: {
      measure_temperature: {
        characteristics: Characteristic.CurrentTemperature,
        get: (value, { device }) => {
          logMappingDecision('measure_temperature', true, 'Current Temperature');
          return MapperUtils.getSafeValue('temperature', value, {
            defaultValue: 20  // Default to 20°C
          });
        }
      },
      target_temperature: {
        characteristics: Characteristic.TargetTemperature,
        get: (value, { device }) => {
          logMappingDecision('target_temperature', true, 'Target Temperature');
          return MapperUtils.getSafeValue('temperature', value, {
            defaultValue: 22  // Default to 22°C
          });
        }
      }
    },
    
    // Optional characteristics and modes
    optional: {
      // Temperature Zones
      'measure_temperature.outdoor': {
        characteristics: Characteristic.CurrentTemperature,
        get: (value, { device }) => {
          logMappingDecision('measure_temperature.outdoor', true, 'Outdoor Temperature');
          return MapperUtils.getSafeValue('temperature', value, {
            defaultValue: 15  // Default outdoor temperature
          });
        }
      },
      
      // Operational Modes - Derive HVAC Mode
      hot_water_mode: {
        characteristics: Characteristic.TargetHeatingCoolingState,
        get: (value, { device }) => {
          logMappingDecision('hot_water_mode', true, 'HVAC Mode');
          return value 
            ? Characteristic.TargetHeatingCoolingState.HEAT 
            : Characteristic.TargetHeatingCoolingState.OFF;
        }
      },
      thermostat_mode: {
        characteristics: Characteristic.TargetHeatingCoolingState,
        get: (value, { device }) => {
          logMappingDecision('thermostat_mode', true, 'HVAC Mode');
          const modeMap = {
            'heat': Characteristic.TargetHeatingCoolingState.HEAT,
            'cool': Characteristic.TargetHeatingCoolingState.COOL,
            'auto': Characteristic.TargetHeatingCoolingState.AUTO,
            'off': Characteristic.TargetHeatingCoolingState.OFF
          };
          return modeMap[value] || Characteristic.TargetHeatingCoolingState.OFF;
        }
      }
    },
    
    // Service configuration
    onService: (service, { device }) => {
      service.setPrimaryService(true);
      service.setCharacteristic(
        Characteristic.Name, 
        device.name || 'Heatpump/Boiler'
      );
      
      // Ensure CurrentHeatingCoolingState is set
      service.setCharacteristic(
        Characteristic.CurrentHeatingCoolingState, 
        Characteristic.CurrentHeatingCoolingState.OFF
      );
      
      // Log service creation
      Logger.info(`[Heatpump/Boiler Mapping] Created Thermostat service for device: ${device.name}`);
    }
  };
};