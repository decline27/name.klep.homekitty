module.exports = (Mapper, Service, Characteristic) => ({
  class: ['vacuumcleaner'],
  service: Service.Switch,
  required: {
    command_start_clean: {
      characteristics: Characteristic.On,
      get: (value, { device }) => {
        // Default to false if the capability value is missing
        return false;
      },
      set: (value) => {
        return value;
      }
    }
  },
  optional: {
    measure_battery: {
      service: Service.BatteryService,
      characteristics: [
        Characteristic.BatteryLevel,
        Characteristic.StatusLowBattery
      ],
      get: (value, { characteristic }) => {
        if (characteristic === 'BatteryLevel') {
          return typeof value === 'number' ? Math.min(Math.max(value, 0), 100) : 0;
        } else if (characteristic === 'StatusLowBattery') {
          return value < 15;
        }
      }
    }
  }
});
