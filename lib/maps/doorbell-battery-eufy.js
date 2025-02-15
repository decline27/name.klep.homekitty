module.exports = (Mapper, Service, Characteristic, Accessory) => ({
  class: ['doorbell'],
  service: Service.Battery,
  category: Accessory.Categories.SENSOR,
  required: {
    measure_battery: {
      characteristics: [
        Characteristic.BatteryLevel,
        Characteristic.StatusLowBattery,
        Characteristic.ChargingState
      ],
      get: (value, { characteristic }) => {
        if (characteristic === 'BatteryLevel') {
          return typeof value === 'number' ? Math.min(Math.max(value, 0), 100) : 0;
        }
        if (characteristic === 'ChargingState') {
          return Characteristic.ChargingState.NOT_CHARGEABLE;
        }
        return value < 15;  // StatusLowBattery
      }
    }
  }
});
