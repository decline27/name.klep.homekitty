module.exports = (Mapper, Service, Characteristic) => ({
  class: [ 'other', 'button' ],
  service: Service.Switch,
  required: {
    // Make the button capability optional
    button: {
      characteristics: Characteristic.On,
      // Simulate a button press with minimal requirements
      set: async (value, { device, service, characteristic }) => {
        if (!value) return false;
        // Turn the switch off after 300ms to simulate a momentary button
        setTimeout(() => {
          service.getCharacteristic(characteristic).updateValue(false);
        }, 300);
        // Trigger the button press
        return true;
      },
      // Always return false to represent a stateless button
      get: Mapper.Fixed.False,
    }
  },
  // Optional: Add a fallback capability mapping
  optional: {
    onoff: {
      characteristics: Characteristic.On,
      set: async (value, { device, service, characteristic }) => {
        if (!value) return false;
        // Similar button press simulation for onoff capability
        setTimeout(() => {
          service.getCharacteristic(characteristic).updateValue(false);
        }, 300);
        return true;
      },
      get: Mapper.Fixed.False,
    }
  }
});