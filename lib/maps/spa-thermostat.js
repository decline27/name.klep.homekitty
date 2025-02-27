const { createMapping, MapperUtils } = require('../mapper-helper');
const { Accessory } = require('../../modules/hap-nodejs');

module.exports = (Mapper, Service, Characteristic) => {
  // Create a custom version of the Thermostat service with expanded temperature range
  class SpaService extends Service.Thermostat {
    constructor(displayName, subtype) {
      super(displayName, subtype);
      
      // Override the TargetTemperature characteristic properties
      // Note: HomeKit has a hard limit of 38°C for target temperature
      this.getCharacteristic(Characteristic.TargetTemperature)
        .setProps({
          minValue: 10,
          maxValue: 38, // Changed from 40 to respect HomeKit's limits
          minStep: 0.5
        });
        
      // Override the CurrentTemperature characteristic properties
      this.getCharacteristic(Characteristic.CurrentTemperature)
        .setProps({
          minValue: 0,
          maxValue: 100,
          minStep: 0.1
        });
    }
  }
  
  // Use the custom service with expanded temperature range
  return createMapping({
    class: ['thermostat', 'spa'],
    service: SpaService, // Use our custom service with expanded range
    category: Accessory.Categories.THERMOSTAT,
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
          // No need to modify props here since our custom service already does that
          const safeTemp = MapperUtils.getSafeValue('temperature', value, {
            defaultValue: 22,  // Default to 22°C
            min: 10,           // Minimum allowed temperature
            max: 38            // Maximum allowed temperature (HomeKit limit)
          });
          
          console.log(`[SPA THERMOSTAT] Temperature value received: ${value}°C, processed: ${safeTemp}°C`);
          
          // Ensure we don't exceed HomeKit's allowed range
          return Math.min(Math.max(safeTemp, 10), 38);
        }
      }
    },
    optional: {
      // Custom status handling
      'measure_Status.status1': {
        characteristics: Characteristic.StatusFault,
        get: (value, { device }) => {
          // Map custom status to HomeKit fault characteristic
          const statusMapping = {
            'error': 1,  // Indicates a fault
            'warning': 1,
            'normal': 0  // No fault
          };
          return statusMapping[value] || 0;
        }
      },
      
      thermostat_mode: {
        characteristics: Characteristic.TargetHeatingCoolingState,
        get: (value, { device }) => {
          const modeMapping = {
            'heat': Characteristic.TargetHeatingCoolingState.HEAT,
            'cool': Characteristic.TargetHeatingCoolingState.COOL,
            'auto': Characteristic.TargetHeatingCoolingState.AUTO,
            'off': Characteristic.TargetHeatingCoolingState.OFF
          };
          return MapperUtils.getSafeValue('heatingCoolingState', 
            modeMapping[value] || Characteristic.TargetHeatingCoolingState.OFF
          );
        }
      }
    },
    
    // Service configuration
    onService: (service, { device }) => {
      console.log(`[SPA THERMOSTAT] Configuring SPA temperature range 10-40°C for ${device.name}`);
      
      // Set display units to Celsius
      service.setCharacteristic(
        Characteristic.TemperatureDisplayUnits,
        Characteristic.TemperatureDisplayUnits.CELSIUS
      );
      
      // Get a reference to characteristics and their properties
      const targetTempChar = service.getCharacteristic(Characteristic.TargetTemperature);
      const currentTempChar = service.getCharacteristic(Characteristic.CurrentTemperature);
      
      // Triple-check properties are set correctly
      console.log('[SPA THERMOSTAT] Making final property adjustments');
      
      // Force modifications to target temperature range
      try {
        targetTempChar.setProps({
          minValue: 10,
          maxValue: 38, // Changed from 40 to respect HomeKit's limits
          minStep: 0.5,
          perms: targetTempChar.props.perms
        });
      } catch (error) {
        console.error('[SPA THERMOSTAT] Error setting final target temp props:', error);
      }
      
      // Force modifications to current temperature range
      try {
        currentTempChar.setProps({
          minValue: 0,
          maxValue: 100,
          minStep: 0.1,
          perms: currentTempChar.props.perms
        });
      } catch (error) {
        console.error('[SPA THERMOSTAT] Error setting final current temp props:', error);
      }
      
      // Set min/max temp values if service supports them
      try {
        // Log the current constraints
        console.log('[SPA THERMOSTAT] Setting min/max temperature constraints');
        
        // Try to use the optional min/max temp constraints if available
        if (Characteristic.TargetTemperatureMinValue) {
          if (!service.testCharacteristic(Characteristic.TargetTemperatureMinValue)) {
            service.addCharacteristic(Characteristic.TargetTemperatureMinValue);
          }
          service.updateCharacteristic(Characteristic.TargetTemperatureMinValue, 10);
        }
        
        if (Characteristic.TargetTemperatureMaxValue) {
          if (!service.testCharacteristic(Characteristic.TargetTemperatureMaxValue)) {
            service.addCharacteristic(Characteristic.TargetTemperatureMaxValue);
          }
          service.updateCharacteristic(Characteristic.TargetTemperatureMaxValue, 38); // Changed from 40 to respect HomeKit's limits
        }
      } catch (error) {
        console.error('[SPA THERMOSTAT] Error setting min/max temp constraints:', error);
      }
      
      // Set device name
      service.setCharacteristic(
        Characteristic.Name, 
        device.name || 'Spa Thermostat'
      );
      
      // Log current property values for debugging
      try {
        console.log('[SPA THERMOSTAT] Final target temperature props:', {
          minValue: targetTempChar.props.minValue,
          maxValue: targetTempChar.props.maxValue,
          minStep: targetTempChar.props.minStep
        });
      } catch (error) {
        console.error('[SPA THERMOSTAT] Error logging temp props:', error);
      }
      
      // Handle temperature values outside the valid range
      try {
        // Override the validation function if possible
        const originalValidate = targetTempChar.validateValue;
        targetTempChar.validateValue = function(value) {
          // Cap at HomeKit's limit of 38°C
          if (value > 38) {
            console.log(`[SPA THERMOSTAT] Capping temperature value from ${value}°C to 38°C due to HomeKit limits`);
            return 38;
          }
          
          if (value <= 38 && value >= 10) {
            return value;
          }
          return originalValidate ? originalValidate.call(this, value) : value;
        };
      } catch (error) {
        console.error('[SPA THERMOSTAT] Error overriding validation:', error);
      }
      
      console.log(`[SPA THERMOSTAT] Configuration complete for ${device.name}`);
    }
  });
};