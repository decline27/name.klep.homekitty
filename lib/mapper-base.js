// mapper-base.js - Base class for creating mappers with inheritance and composition

const { ValueConverter, CapabilityMapper } = require('./mapper-capability-utils');

/**
 * Flexible base mapper class that supports composition and inheritance
 * for creating HomeKit device mappings
 */
class BaseMapper {
  /**
   * Create a new BaseMapper
   * @param {string|string[]} deviceClass - Device class(es) to map
   * @param {Object} service - HomeKit service
   * @param {Object} options - Additional options
   */
  constructor(deviceClass, service, options = {}) {
    this.class = deviceClass;
    this.service = service;
    this.category = options.category;
    this.onService = options.onService;
    this.onUpdate = options.onUpdate;
    this.group = options.group || false;
    this.requiredMatchPercentage = options.requiredMatchPercentage || 40;
    this.fallbackEnabled = options.fallbackEnabled || false;
    this.isFallbackMap = options.isFallbackMap || false;
    this.capabilities = {
      required: {},
      optional: {},
      triggers: {},
      forbidden: []
    };
    this.name = options.name || null;
  }

  /**
   * Add a required capability mapping
   * @param {string} name - Capability name
   * @param {Object} config - Capability configuration
   * @returns {BaseMapper} - This instance for chaining
   */
  addRequiredCapability(name, config) {
    this.capabilities.required[name] = config;
    return this;
  }

  /**
   * Add an optional capability mapping
   * @param {string} name - Capability name
   * @param {Object} config - Capability configuration
   * @returns {BaseMapper} - This instance for chaining
   */
  addOptionalCapability(name, config) {
    this.capabilities.optional[name] = config;
    return this;
  }

  /**
   * Add a trigger capability mapping
   * @param {string} name - Capability name
   * @param {Object} config - Capability configuration
   * @returns {BaseMapper} - This instance for chaining
   */
  addTriggerCapability(name, config) {
    this.capabilities.triggers[name] = config;
    return this;
  }

  /**
   * Add a forbidden capability
   * @param {string} name - Capability name
   * @returns {BaseMapper} - This instance for chaining
   */
  addForbiddenCapability(name) {
    this.capabilities.forbidden.push(name);
    return this;
  }

  /**
   * Set the required match percentage
   * @param {number} percentage - Match percentage (0-100)
   * @returns {BaseMapper} - This instance for chaining
   */
  setRequiredMatchPercentage(percentage) {
    this.requiredMatchPercentage = percentage;
    return this;
  }

  /**
   * Enable or disable fallback mode
   * @param {boolean} enabled - Whether fallback is enabled
   * @returns {BaseMapper} - This instance for chaining
   */
  setFallbackEnabled(enabled) {
    this.fallbackEnabled = enabled;
    return this;
  }

  /**
   * Set this as a fallback map
   * @param {boolean} isFallback - Whether this is a fallback map
   * @returns {BaseMapper} - This instance for chaining
   */
  setIsFallbackMap(isFallback) {
    this.isFallbackMap = isFallback;
    return this;
  }

  /**
   * Set the mapper name
   * @param {string} name - Mapper name
   * @returns {BaseMapper} - This instance for chaining
   */
  setName(name) {
    this.name = name;
    return this;
  }

  /**
   * Set the category
   * @param {Object} category - HomeKit category
   * @returns {BaseMapper} - This instance for chaining
   */
  setCategory(category) {
    this.category = category;
    return this;
  }

  /**
   * Set the onService handler
   * @param {Function} handler - Handler function
   * @returns {BaseMapper} - This instance for chaining
   */
  setOnService(handler) {
    this.onService = handler;
    return this;
  }

  /**
   * Set the onUpdate handler
   * @param {Function} handler - Handler function
   * @returns {BaseMapper} - This instance for chaining
   */
  setOnUpdate(handler) {
    this.onUpdate = handler;
    return this;
  }

  /**
   * Enable or disable grouping
   * @param {boolean} enabled - Whether grouping is enabled
   * @returns {BaseMapper} - This instance for chaining
   */
  setGroup(enabled) {
    this.group = enabled;
    return this;
  }

  /**
   * Extend this mapper with settings from another mapper
   * @param {BaseMapper} baseMapper - The mapper to extend from
   * @returns {BaseMapper} - This instance for chaining
   */
  extend(baseMapper) {
    // Keep own class and service
    
    // Merge capabilities
    Object.assign(this.capabilities.required, baseMapper.capabilities.required);
    Object.assign(this.capabilities.optional, baseMapper.capabilities.optional);
    Object.assign(this.capabilities.triggers, baseMapper.capabilities.triggers);
    
    // Merge forbidden capabilities (deduplicating)
    const forbiddenSet = new Set([
      ...this.capabilities.forbidden,
      ...baseMapper.capabilities.forbidden
    ]);
    this.capabilities.forbidden = Array.from(forbiddenSet);
    
    // Take other properties if not already set
    if (!this.category && baseMapper.category) {
      this.category = baseMapper.category;
    }
    if (!this.onService && baseMapper.onService) {
      this.onService = baseMapper.onService;
    }
    if (!this.onUpdate && baseMapper.onUpdate) {
      this.onUpdate = baseMapper.onUpdate;
    }
    
    return this;
  }

  /**
   * Build the final mapper object
   * @returns {Object} - The mapper configuration
   */
  build() {
    return {
      class: this.class,
      service: this.service,
      category: this.category,
      onService: this.onService,
      onUpdate: this.onUpdate,
      group: this.group,
      required: this.capabilities.required,
      optional: this.capabilities.optional,
      triggers: Object.keys(this.capabilities.triggers).length > 0 ? 
        this.capabilities.triggers : undefined,
      forbidden: this.capabilities.forbidden.length > 0 ? 
        this.capabilities.forbidden : undefined,
      requiredMatchPercentage: this.requiredMatchPercentage,
      fallbackEnabled: this.fallbackEnabled,
      isFallbackMap: this.isFallbackMap,
      name: this.name
    };
  }
  
  // Helper static methods to easily access common capability mappers
  static get ValueConverter() {
    return ValueConverter;
  }
  
  static get CapabilityMapper() {
    return CapabilityMapper;
  }
}

module.exports = BaseMapper;