module.exports = (Mapper, Service, Characteristic) => ({
  class: ['sensor'],
  service: Service.PowerMeterService,
  required: {
    measure_power: {
      characteristics: Characteristic.CurrentPowerConsumption,
      get: value => value || 0  // Return 0 if no value
    }
  },
  optional: {
    meter_power: {
      characteristics: Characteristic.TotalPowerConsumption,
      get: value => value || 0  // Return 0 if no value
    }
  }
});
