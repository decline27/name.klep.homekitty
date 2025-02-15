module.exports = (Mapper, Service, Characteristic, Accessory) => ({
  class: ['doorbell'],
  service: Service.Doorbell,
  category: Accessory.Categories.VIDEO_DOORBELL,
  required: {
    NTFY_PRESS_DOORBELL: {
      characteristics: Characteristic.ProgrammableSwitchEvent,
      get: () => Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS
    }
  }
});