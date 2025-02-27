module.exports = {
  // DON'T CHANGE THESE UNLESS YOU KNOW WHAT YOU'RE DOING
  BRIDGE_FIRMWARE_REVISION:        '3.0',
  PERSISTENCE_DIRECTORY_PREFIX:    '/userdata/homekitty-persist_dev',
  // defaults
  DEFAULT_BRIDGE_IDENTIFIER:       'HomeKitty_dev',
  DEFAULT_USERNAME:                'FA:CE:13:37:CA:79',
  DEFAULT_PORT:                    31339,
  DEFAULT_SETUP_ID:                'CATS',
  DEFAULT_PIN_CODE:                '133-78-055', // XXX: needs this formatting
  // settings keys
  SETTINGS_APP_DELAY_AFTER_REBOOT: 'App.DelayAfterReboot',
  SETTINGS_BRIDGE_IDENTIFIER:      'Bridge.Identifier',
  SETTINGS_BRIDGE_USERNAME:        'Bridge.Username',
  SETTINGS_BRIDGE_PORT:            'Bridge.Port',
  SETTINGS_BRIDGE_SETUP_ID:        'Bridge.SetupID',
  SETTINGS_BRIDGE_PINCODE:         'Bridge.Pincode',
  SETTINGS_EXPOSE_MAP:             'HomeKit.Exposed',
};
