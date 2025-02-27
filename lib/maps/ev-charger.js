module.exports = (Mapper, Service, Characteristic) => ({
  class: ['evcharger'],
  service: Service.Switch,
  required: {
    onoff: {
      characteristics: Characteristic.On,
      get: (value) => value === true,
      set: (value) => value
    },
    charger_status: {
      characteristics: Characteristic.StatusActive,
      get: (value) => {
        // Map charger status to active state
        switch(value) {
          case 'charging':
          case 'ready':
            return true;
          default:
            return false;
        }
      }
    }
  },
  optional: {
    measure_power: {
      characteristics: Characteristic.CurrentPower,
      get: (value) => value || 0
    },
    measure_current: {
      characteristics: Characteristic.CurrentPower,
      get: (value) => value || 0
    },
    meter_power: {
      characteristics: Characteristic.TotalConsumption,
      get: (value) => value || 0
    },
    target_charger_current: {
      characteristics: Characteristic.CurrentPower,
      get: (value) => value || 0
    }
  }
});