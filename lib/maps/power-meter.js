const BaseMapper = require('../mapper-base');

/**
 * Map power meter devices to HomeKit as a sensor accessory
 * This handles devices that only have measure_power capability
 */
module.exports = (Mapper, Service, Characteristic, Accessory) => {
  const powerMeterMapper = new BaseMapper(
    // Match device classes that commonly have power meters
    ['sensor', 'other'],
    // Use outlet service as it's most appropriate for power monitoring
    Service.Outlet,
    {
      // Configuration options
      name: 'Power Meter',
      requiredMatchPercentage: 90, // High threshold to be specific
      onService: (service, { device }) => {
        // Add a descriptive name
        service.setCharacteristic(
          Characteristic.Name, 
          `${device.name} Power Meter`
        );
        
        // Set outlet in use to true since it's measuring power
        service.setCharacteristic(
          Characteristic.OutletInUse, 
          true
        );
      },
      // Use appropriate accessory category
      category: Accessory.Categories.OUTLET
    }
  );

  // Required capability - the only one we need
  powerMeterMapper.addRequiredCapability('measure_power', 
    BaseMapper.CapabilityMapper.powerMeter());

  // Add outlet in use characteristic as a separate mapping
  powerMeterMapper.addOptionalCapability('measure_power_status', {
    characteristics: Characteristic.OutletInUse,
    get: () => true // Always show as in use if it has power measurement
  });

  // Optional capabilities for enhanced functionality
  powerMeterMapper.addOptionalCapability('onoff', 
    BaseMapper.CapabilityMapper.onOff());
  
  powerMeterMapper.addOptionalCapability('measure_battery', 
    BaseMapper.CapabilityMapper.batteryLevel());
  
  // Return the built mapper
  return powerMeterMapper.build();
};