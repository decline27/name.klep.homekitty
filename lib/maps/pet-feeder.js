module.exports = (Mapper, Service, Characteristic) => ({
  class: ['petfeeder'],
  service: Service.Switch,
  required: {
    command_feed: {
      characteristics: Characteristic.On,
      get: (value) => false,  // Always return false since it's a momentary command
      set: (value) => value   // Allow setting to trigger feed
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
