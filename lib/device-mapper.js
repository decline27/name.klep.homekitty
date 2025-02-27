const { Accessory, Service, Characteristic, AccessoryEventTypes, uuid } = require('../modules/hap-nodejs');
const { MappedDevice } = require('./mapped-device');
const Logger = require('./logger');

const Mapper = module.exports = new (class MapperImpl {
  // private
  #MAPS    = [];
  #DEVICES = {};
  #logger  = Logger;
  Constants = {
    NO_VALUE : Symbol('NO_VALUE')
  };

  // "statics"
  Utils = {
    normalizeCapability     : cap => cap.split('.')[0],
    normalizeCapabilities   : caps => Object.keys(caps.reduce((acc, cap) => (acc[Mapper.Utils.normalizeCapability(cap)] = true, acc), {})),
    hasCapability           : (device, cap) => device.capabilities?.some(capability => Mapper.Utils.normalizeCapability(capability) === cap),
    allCapabilitiesMatching : (device, cap) => device.capabilities?.filter(capability => capability === cap || capability.startsWith(`${ cap }.`)) || [],
    hasCapabilityWithValue  : (device, cap, value) => Mapper.Utils.allCapabilitiesMatching(device, cap).some(capability => device.capabilitiesObj?.[capability]?.value === value),
    upperFirst              : s => String(s).replace(/^./, m => m[0].toUpperCase()),
    mapValue                : (value, x1, y1, x2, y2) => (value - x1) * (y2 - x2) / (y1 - x1) + x2,
  };

  Fixed = {
    True:   () => true,
    False:  () => false,
    Null:   () => null,
  };

  setLogger(logger) {
    // Keep original behavior but convert to use our logger
    if (typeof logger === 'function') {
      // If passed a function, create a wrapper that calls info
      const origLogger = logger;
      this.#logger = {
        info: (...args) => origLogger(...args),
        error: (...args) => origLogger('[ERROR]', ...args),
        warn: (...args) => origLogger('[WARN]', ...args),
        debug: (...args) => origLogger('[DEBUG]', ...args)
      };
    } else {
      this.#logger = logger || Logger;
    }
  }

  createMap(obj) {
    // Validate map object before adding
    if (!obj || typeof obj !== 'object') {
      this.#logger.error(`Invalid map object: ${JSON.stringify(obj)}`);
      return;
    }

    // Ensure critical properties exist
    if (!obj.class) {
      this.#logger.warn(`Map object missing 'class' property: ${JSON.stringify(obj)}`);
    }

    // Optional: Add name if not present
    if (!obj.name) {
      this.#logger.info(`Map object has no 'name', generating default`);
      obj.name = obj.name || 'Unnamed Mapping';
    }

    this.#MAPS.push(obj);
  }

  mapDevice(device) {
    const FAIL = device => ( this.#DEVICES[device.id] = null, null );

    // check cache first
    if (device.id in this.#DEVICES) return this.#DEVICES[device.id];

    // Find all available capability names for the device
    const allDeviceCapabilities = device.capabilities || [];
    this.#logger.debug(`Device ${device.name} has raw capabilities: ${allDeviceCapabilities.join(', ')}`);

    // find maps that match the device class or virtual class
    let possibleMaps = this.#MAPS.filter(map => {
      const classes = [ map.class ].flat();
      // Match specific classes OR wildcard (*) OR fallback maps
      return classes.includes('*') || 
             classes.includes(device.class) || 
             classes.includes(device.virtualClass) ||
             (map.isFallbackMap === true);
    });
    
    // If no possible maps, try fallback maps
    if (! possibleMaps.length) {
      possibleMaps = this.#MAPS.filter(map => map.fallbackEnabled === true);
      this.#logger.info(`No direct class matches, attempting ${possibleMaps.length} fallback maps for ${device.name || 'Unnamed'}`);
    }
    
    if (! possibleMaps.length) return FAIL(device);

    // load list of capabilities based on UI visibility and normalize them
    const capabilities = Mapper.Utils.normalizeCapabilities(device.ui?.components?.map(c => c.capabilities).flat() || []);

    // filter possible maps against required and forbidden capabilities
    const usableMaps = possibleMaps.filter(map => {
      const required  = Object.keys(map.required);
      const forbidden = map.forbidden || [];
      
      // Calculate capability match percentage
      const matchedCapabilities = required.filter(cap => capabilities.includes(cap));
      const matchPercentage = (matchedCapabilities.length / required.length) * 100;
      
      // Log mapping attempt details
      this.#logger.debug(`Mapping device: ${device.name || 'Unnamed'}, Class: ${device.class}`);
      this.#logger.debug(`Required capabilities: ${required.join(', ')}`);
      this.#logger.debug(`Device capabilities: ${capabilities.join(', ')}`);
      this.#logger.debug(`Matched capabilities: ${matchedCapabilities.join(', ')}`);
      this.#logger.debug(`Match percentage: ${matchPercentage.toFixed(2)}%`);
      
      // Also check raw capabilities for deeper debugging
      const rawMatchedCapabilities = required.filter(cap => allDeviceCapabilities.includes(cap));
      if (rawMatchedCapabilities.length !== matchedCapabilities.length) {
        this.#logger.debug(`Raw capability matches: ${rawMatchedCapabilities.join(', ')}`);
        this.#logger.debug(`Raw capability match percentage: ${(rawMatchedCapabilities.length / required.length * 100).toFixed(2)}%`);
      }
      
      // Determine required match threshold based on map configuration
      // Default is 40% for more lenient mapping, but maps can specify their own threshold
      const requiredMatchPercentage = map.requiredMatchPercentage || 40;
      
      // If map has "fallbackEnabled" flag, allow even lower match percentage (25%)
      const fallbackThreshold = map.fallbackEnabled ? 25 : requiredMatchPercentage;
      
      // Allow mapping if match percentage meets threshold and no forbidden capabilities
      const isNotForbidden = ! forbidden.some(cap => capabilities.includes(cap));
      return matchPercentage >= fallbackThreshold && isNotForbidden;
    });
    
    if (! usableMaps.length) {
      this.#logger.warn(`No usable maps found for device: ${device.name || 'Unnamed'}`);
      return FAIL(device);
    }

    // now find maps that match the virtual device class, which we prefer
    const preferredMaps = usableMaps.filter(map => {
      const classes = [ map.class ].flat();
      return classes.includes(device.virtualClass);
    });

    // Sort maps by match percentage and prioritize non-fallback maps
    const sortMaps = (maps) => {
      return maps.sort((a, b) => {
        const aRequired = Object.keys(a.required);
        const bRequired = Object.keys(b.required);
        
        // Calculate match percentages
        const aMatched = aRequired.filter(cap => capabilities.includes(cap));
        const bMatched = bRequired.filter(cap => capabilities.includes(cap));
        
        const aPercentage = (aMatched.length / aRequired.length) * 100;
        const bPercentage = (bMatched.length / bRequired.length) * 100;
        
        // Prioritize non-fallback maps over fallback maps
        if (a.isFallbackMap !== b.isFallbackMap) {
          return a.isFallbackMap ? 1 : -1;
        }
        
        // Then sort by match percentage (higher first)
        return bPercentage - aPercentage;
      });
    };

    // Use preferred maps if available, otherwise use regular usable maps
    const actualMaps = sortMaps(preferredMaps.length ? preferredMaps : usableMaps);
    
    // Log the selected map
    const selectedMap = actualMaps[0];
    this.#logger.info(`Selected map: ${selectedMap.name || 'Unnamed'} for device: ${device.name || 'Unnamed'}`);
    if (selectedMap.isFallbackMap) {
      this.#logger.warn(`Using fallback map with limited functionality for ${device.name}`);
    }
    
    // Create the mapped device using the best map
    const mappedDevice = this.#DEVICES[device.id] = new MappedDevice(this, device, actualMaps.shift(), this.#logger);

    // Improved approach to additional maps - limit to avoid conflicts
    // Check the service types to prevent duplicate/conflicting services
    const primaryMap = mappedDevice.getPrimaryMap();
    const primaryService = primaryMap.service;
    
    // Track services already mapped to avoid duplicates
    const mappedServices = new Set([primaryService.UUID]);
    
    // Only add secondary maps if they use different services
    for (const map of actualMaps) {
      // Skip universal-fallback to prevent duplicates and conflicts
      if (map.name === 'universal-fallback') {
        this.#logger.debug(`Skipping universal-fallback map to prevent conflicts for ${device.name || 'Unnamed'}`);
        continue;
      }
      
      // Skip legacy mappers that conflict with improved mappers
      if ((map.name === 'speaker' && primaryMap.name.includes('speaker-improved')) ||
          (map.name === 'smart-speaker' && primaryMap.name.includes('sonos'))) {
        this.#logger.debug(`Skipping ${map.name} to prevent conflicts with ${primaryMap.name} for ${device.name || 'Unnamed'}`);
        continue;
      }
      
      // Skip maps with duplicate service types
      if (map.service && mappedServices.has(map.service.UUID)) {
        this.#logger.debug(`Skipping ${map.name} with duplicate service type for ${device.name || 'Unnamed'}`);
        continue;
      }
      
      // Skip maps with the same name pattern (to avoid multiple "improved" versions)
      if (primaryMap.name.includes('-improved') && map.name.includes('-improved') && 
          primaryMap.name !== map.name) {
        this.#logger.debug(`Skipping additional improved mapper ${map.name} for ${device.name || 'Unnamed'}`);
        continue;
      }
      
      // Add the map and track its service
      this.#logger.debug(`Adding secondary map ${map.name} to ${device.name}`);
      mappedDevice.addMap(map);
      if (map.service) {
        mappedServices.add(map.service.UUID);
      }
    }

    // Done
    return mappedDevice;
  }

  forgetDevice(device) {
    const mappedDevice = this.#DEVICES[device.id];
    if (! mappedDevice) return;
    mappedDevice.cleanup();
    delete this.#DEVICES[device.id];
  }

  getDeviceById(id) {
    return this.#DEVICES[id];
  }

  canMapDevice(device) {
    return !! this.mapDevice(device);
  }
})();

require('./mapper-accessors')(Mapper);
require('./mapper-characteristics')(Mapper);

// Load all mappers from the maps directory
const mapperFiles = require('require-all')(__dirname + '/maps');

// First load the old-style mappers (for backward compatibility)
let legacyMapperCount = 0;
Object.entries(mapperFiles)
  .filter(([name, mapperFunction]) => 
    // Skip improved/new-style mappers and README
    !name.includes('-improved') && 
    !name.includes('README') && 
    !name.includes('universal-fallback'))
  .forEach(([name, mapperFunction]) => {
    try {
      const mapper = mapperFunction(Mapper, Service, Characteristic, Accessory);
      mapper.name = name;
      Mapper.createMap(mapper);
      legacyMapperCount++;
    } catch (error) {
      Logger.error(`Failed to load legacy mapper: ${name} - ${error.message}`);
    }
  });

Logger.info(`Loaded ${legacyMapperCount} legacy mappers`);

// Then load the new-style mappers (which use the BaseMapper)
let improvedMapperCount = 0;
Object.entries(mapperFiles)
  .filter(([name, mapperFunction]) => 
    // Only load improved/new-style mappers
    (name.includes('-improved') || name.includes('universal-fallback')) && 
    !name.includes('README'))
  .forEach(([name, mapperFunction]) => {
    try {
      const mapper = mapperFunction(Mapper, Service, Characteristic, Accessory);
      mapper.name = name;
      Mapper.createMap(mapper);
      improvedMapperCount++;
    } catch (error) {
      Logger.error(`Failed to load improved mapper: ${name} - ${error.message}`);
    }
  });

Logger.info(`Loaded ${improvedMapperCount} improved mappers`);
// Use a public method to get total mapper count to avoid using private field
const totalMapperCount = legacyMapperCount + improvedMapperCount;
Logger.info(`Loaded ${totalMapperCount} mappers in total`);
