module.exports = (Mapper, Service, Characteristic) => ({
  // Define which Homey device classes this mapping applies to
  class: ['socket'],
  
  // Use HomeKit's Outlet service
  service: Service.Outlet,
  
  // Required capabilities
  required: {
    // Map onoff capability to HomeKit's On characteristic
    onoff: {
      characteristics: Characteristic.On,
      ...Mapper.Accessors.OnOff
    }
  },
  
  // Optional capabilities
  optional: {
    // Map power measurement if available
    measure_power: {
      characteristics: Characteristic.OutletInUse,
      get: value => value > 0  // Outlet is "in use" if power > 0
    }
  }
});
