const { Accessory, Service, Characteristic, AccessoryEventTypes, uuid } = require('../modules/hap-nodejs');
const debounce = require('debounce');

module.exports.MappedDevice = class MappedDevice {
  #mapper;
  #device;
  #class;
  #capabilities;
  #category;
  #logger;
  #maps      = [];
  #accessory = null;
  #listeners = [];

  constructor(mapper, device, map, logger) {
    this.#mapper       = mapper;
    this.#device       = device;
    this.#class        = device.class;
    this.#capabilities = [...device.capabilities];
    this.#device.name  = this.#device.name || `${ this.#mapper.Utils.upperFirst(device.class) } Device`;
    
    // Set the logger - handle different logger formats
    if (logger) {
      if (typeof logger === 'function') {
        this.#logger = logger;
      } else if (typeof logger.info === 'function') {
        // Using our custom Logger object
        this.#logger = (...args) => logger.info(...args);
      } else {
        // Fallback to console.log
        this.#logger = console.log;
      }
    } else {
      this.#logger = console.log;
    }
    
    this.#category     = map.category ?? Accessory.Categories.OTHER;
    this.#maps.push(map);
  }

  getDevice() {
    return this.#device;
  }

  getCapabilities() {
    return this.#capabilities;
  }

  getClass() {
    return this.#class;
  }
  
  getPrimaryMap() {
    // Return the first map, which is the primary one
    return this.#maps[0] || null;
  }

  cleanup() {
    this.#listeners.forEach(listener => listener.destroy());
  }

  addMap(map) {
    // Validate map object before adding
    if (!map || typeof map !== 'object') {
      this.#logger(`[WARN] Attempted to add invalid map: ${JSON.stringify(map)}`);
      return;
    }

    // Update category if needed
    if (this.#category === Accessory.Categories.OTHER) {
      this.#category = map.category ?? Accessory.Categories.OTHER;
    }

    // Ensure map has critical properties
    if (!map.service) {
      this.#logger(`[WARN] Map missing service: ${JSON.stringify(map)}`);
      return;
    }

    // Add a default name if not present
    if (!map.name) {
      map.name = map.class || 'Unnamed Mapping';
      this.#logger(`[INFO] Generated default map name: ${map.name}`);
    }

    this.#maps.push(map);
  }

  createAccessory() {
    // XXX: if UUID generation changes, update `App#getAccessoryById()` as well!
    const accessory = new Accessory(this.#device.name, uuid.generate(this.#device.id), this.#category);

    accessory.on(AccessoryEventTypes.IDENTIFY, (paired, callback) => {
      this.log('identify');
      // NOOP
      callback();
    });

    accessory
      .getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, String(this.#device.driverId).replace(/^homey:app:/, ''))
      .setCharacteristic(Characteristic.Model,        `${ this.#device.name } (${ this.#device._zoneName || 'onbekende zone' })`)
      .setCharacteristic(Characteristic.SerialNumber, this.#device.id);

    return accessory;
  }

  updateCapability(capability, value) {
    if (! this.#device.capabilitiesObj) {
      this.#device.capabilitiesObj = {};
    }
    if (! this.#device.capabilitiesObj[capability]) {
      this.#device.capabilitiesObj[capability] = {};
    }
    this.#device.capabilitiesObj[capability].value = value;
  }

  groupCapabilities() {
    // only extract visible capabilities
    const capabilities = this.#device.ui?.components?.map(c => c.capabilities).flat() || [];
    return capabilities.reduce((acc, cap) => {
      const [ capability, group = '' ] = cap.split('.');
      if (! acc[group]) acc[group] = [];
      acc[group].push(capability);
      return acc;
    }, {})
  }

  flattenGroups(groups) {
    // sort group names on length, sortest first
    const groupNames = Object.keys(groups).sort((a, b) => a.length - b.length);

    // process each group and leave only the capabilities that don't already belong in a 'shorter' group
    return groupNames.reduce((acc, group) => {
      acc.groups[group] = groups[group].filter(cap => ! (cap in acc.seen)).map(cap => {
        acc.seen[cap] = true;
        return cap;
      });
      return acc;
    }, { groups : {}, seen : {} }).groups;
  }

  accessorize() {
    const [ cachedAccessory, device ] = [ this.#accessory, this.#device ];

    // shortcut
    if (cachedAccessory) return cachedAccessory;

    // start creating HomeKit accessory
    console.log(`[MAPPING-ACCESSORY] Creating accessory for ${this.#device.name}, ID: ${this.#device.id}, Class: ${this.#class}, Maps: ${this.#maps.map(m => m.name).join(',')}`);
    const accessory = this.#accessory = this.createAccessory();

    // group capabilities based on their suffix (so `onoff.1` and `dim.1` are
    // assumed to belong together)
    let groups = this.groupCapabilities();

    // for each map, and each group, create a service
    for (const map of this.#maps) {
      this.log(`map '${ map.name || map.class || 'Unnamed Mapping' }':`);
      for (const [ group, capabilities ] of Object.entries(map.group ? groups : this.flattenGroups(groups))) {
        let service;

        this.log(2, `- group '${ group || 'DEFAULT' }' [${ capabilities }]`);

        // for each (supported) capability, create characteristics
        for (const prefix of capabilities) {
          // full name of capability
          const capability = `${ prefix }${ group ? '.' + group : '' }`;

          // get characteristic maps for this capability
          const characteristicMaps = map.required?.[prefix] || map.optional?.[prefix] || map.triggers?.[prefix];
          if (! characteristicMaps) {
            // unable to map this particular capability
            continue;
          }

          // we have to deal with triggers differently below
          const isTrigger = !!map.triggers?.[prefix];

          // if we can at least map one capability to a characteristic, create
          // the actual service (if it doesn't already exist)
          if (! service) {
            service = accessory.getService(map.service);
            if (! service || map.group === true) {
              this.log(4, `- new service ${ map.service.name }`);
              service = accessory.addService(map.service, device.name, group || 'default');
            } else {
              this.log(4, `- existing service ${ map.service.name }`);
            }
            if (typeof map.onService === 'function') {
              map.onService(service, { device });
            }
          }

          for (const characteristicMap of [ characteristicMaps ].flat()) {
            const debounceTimeout   = characteristicMap.debounce || 0;
            const debounceImmediate = characteristicMap.debounce ? false : true;

            // determine getters/setters:
            // - first generate an array of getters/setters
            // - check if the device has this capability:
            //   - if so : use the first get/set function in the array
            //   - if not: use the second get/set function (the "fallback")
            //
            // this allows required characteristics to be implemented for devices
            // that don't have the matching capability
            const getters = [ characteristicMap.get ].flat();
            const setters = [ characteristicMap.set ].flat();
            const getter  = getters[ device.capabilities.includes(capability) ? 0 : 1 ];
            const setter  = setters[ device.capabilities.includes(capability) ? 0 : 1 ];

            // Skip if no characteristics defined for this capability map
            if (!characteristicMap.characteristics) {
              this.log(6, `- [${ capability }] skipped (no characteristics defined)`);
              return [];
            }
            
            // next step: create each characteristic (there can be multiple) with
            // all the relevant event handlers
            const characteristics = [ characteristicMap.characteristics ].flat().map(klass => {
              if (!klass) {
                this.log(6, `- [${ capability }] warning: null characteristic class`);
                return null;
              }
              
              const characteristic = service.getCharacteristic(klass);
              this.log(6, `- [${ capability }] ${ isTrigger ? 'triggers' : '→' } [${ klass.name }] (debounce ${ debounceTimeout }ms)`);

              // if map has an onUpdate handler, watch for changes
              if (map.onUpdate) {
                characteristic.on('change', async ({ oldValue, newValue }) => {
                  //this.log(`onUpdate — capability=${ capability } characteristic=${ characteristic.constructor.name } old=${ oldValue } new=${ newValue }`);
                  map.onUpdate({ characteristic : characteristic.constructor.name, oldValue, newValue, service, device, capability });
                });
              }

              // we don't register get/set handlers on the characteristic for trigger capabilities
              if (! isTrigger) {
                if (getter) {
                  characteristic.onGet(async () => {
                    const rawValue = device.capabilitiesObj?.[capability]?.value;
                    if (rawValue === undefined) throw Error(`missing capability value for '${ capability }'`); // can happen if device is (temporarily) unavailable
                    return characteristic.validateUserInput( await getter(rawValue, { device, service, characteristic : characteristic.constructor.name }) );
                  });
                }
                if (setter) {
                  characteristic.onSet(debounce(async (rawValue, callback) => {
                    try {
                      // Process the value and set it on the device
                      const value = await setter(rawValue, { device, service, characteristic : characteristic.constructor.name });
                      await this.#device.setCapabilityValue(capability, value).catch(err => {
                        this.log(`Error setting capability value for ${capability}: ${err.message}`);
                      });
                      
                      // Update internal device state
                      this.updateCapability(capability, value);
                      
                      // Always ensure callback is called to prevent "write handler didn't respond" errors
                      if (typeof callback === 'function') {
                        callback();
                      }
                    } catch (error) {
                      this.log(`Error in characteristic onSet handler for ${capability}: ${error.message}`);
                      // Still call callback even on error to prevent hanging
                      if (typeof callback === 'function') {
                        callback(error);
                      }
                    }
                  }, debounceTimeout, debounceImmediate));
                }
              }

              return characteristic;
            }).filter(Boolean); // Filter out any null values
            
            // Skip creating listeners if no valid characteristics
            if (characteristics.length === 0) {
              this.log(6, `- [${ capability }] skipped creating listeners (no valid characteristics)`);
              return;
            }

            // lastly: create a capability instance and update the
            // characteristic(s) when the capability changes value
            this.#listeners.push(
              device.makeCapabilityInstance(capability, debounce(async rawValue => {
                this.log(`capability update - capability=${ capability } raw=${ rawValue }`);

                // update each characteristic separately (getter may return
                // a specific value for a specific characteristic)
                for (const characteristic of characteristics) {
                  if (!characteristic) continue; // Skip null characteristics
                  
                  const name  = characteristic.constructor.name;
                  const value = await getter(rawValue, { device, service, capability, characteristic : name });
                  if (value === this.#mapper.Constants.NO_VALUE) continue;
                  this.log(`- update characteristic - name = ${ name } value =`, value);
                  characteristic.updateValue(characteristic.validateUserInput(value));
                }

                // update internal device state
                this.updateCapability(capability, rawValue);
              }, debounceTimeout, debounceImmediate))
            );
          }
        }
      }
    }
    //console.log( accessory.services.map(s => ({ name: s.constructor.name, char: s.characteristics.map(c => c.constructor.name) })) );
    return accessory;
  }

  log(...messages) {
    let indent = '';
    if (typeof messages[0] === 'number') {
      indent = ''.padStart(messages.shift());
    }
    
    try {
      if (this.#logger) {
        this.#logger(`[${ this.toString() }]${ indent }`, ...messages);
      } else {
        // Fallback to console.log if logger is not available
        console.log(`[${ this.toString() }]${ indent }`, ...messages);
      }
    } catch (error) {
      // Last resort fallback if logger fails
      console.log(`[${this.#device?.name || 'Device'}] ${indent}`, ...messages);
      console.error('Logger error:', error);
    }
  }

  toString() {
    return `${ this.#device.name }`;
  }
}
