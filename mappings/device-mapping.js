// device-mapping.js
// This file maps Homey device data (extracted via Homeyscript) to HomeKit accessory definitions.
// Each entry in the exported array represents one device from your Homey installation.
// You can later use the homekitMapping property to configure how the device is exposed to HomeKit.

const devicesMapping = [
  {
    id: "a7e86b4b-107d-434b-9cf0-9013369d24f1",
    name: "Kjetil's Homey",
    capabilities: ["0"],
    zone: "9919ee1e-ffbc-480b-bc4b-77fb047e9e68",
    manufacturer: "unknown",
    homekitMapping: null
  },
  // ... (rest of the device mappings from user's example)
  {
    id: "fa5f78ae-99ba-40b4-b305-640c02f7a383",
    name: "Kitchen display",
    capabilities: ["0", "1", "2", "3", "4", "5", "6", "7"],
    zone: "2ab5a003-0120-4c01-80f2-a237dcf4ba14",
    manufacturer: "unknown",
    homekitMapping: {
      category: "TELEVISION",
      service: "Television",
      characteristics: ["Active", "ActiveIdentifier"]
    }
  }
];

module.exports = devicesMapping;