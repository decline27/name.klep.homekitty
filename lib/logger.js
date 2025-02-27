const fs = require('fs');
const path = require('node:path');

class Logger {
  constructor() {
    // Set up log file paths based on environment
    const projectRoot = path.resolve(__dirname, '..');
    
    // Check if we're running in the Homey build environment
    const isHomeyBuildEnv = fs.existsSync(path.join(projectRoot, '.homeybuild'));
    
    // Determine the log directory path
    if (isHomeyBuildEnv) {
      // Use .homeybuild/logs directory when running in Homey build environment
      this.logDir = path.join(projectRoot, '.homeybuild', 'logs');
    } else {
      // Use regular logs directory for local development
      this.logDir = path.join(projectRoot, 'logs');
    }
    
    // Set up log file paths
    this.appLogPath = path.join(this.logDir, 'app.log');
    this.debugLogPath = path.join(this.logDir, 'debug.log');
    this.exceptionLogPath = path.join(this.logDir, 'exceptions.log');
    
    // Detect Homey environment - but allow the option to force file logging
    this.isHomeyEnvironment = process.env.HOMEY_ENV === 'true' || 
                             !!global.Homey ||
                             process.cwd().includes('/userdata/') ||
                             process.cwd() === '/';
    
    // IMPORTANT: We always want to try file logging locally, even when running the Homey app
    // By default, use file logging unless we're actually running on a Homey device
    this.useFileLogging = !this.isHomeyEnvironment || 
                          process.env.FORCE_FILE_LOGGING === 'true';
    
    // If we're in Homey environment and not forcing file logging, just log to console
    if (this.isHomeyEnvironment && !this.useFileLogging) {
      console.log('Running in Homey environment - using console logging only');
    } else {
      // Normal development environment - try to create log directory
      try {
        if (!fs.existsSync(this.logDir)) {
          fs.mkdirSync(this.logDir, { recursive: true });
        }
        console.log(`Log directory (absolute path): ${this.logDir}`);
      } catch (error) {
        console.error(`Failed to create log directory: ${error.message}`);
        this.useFileLogging = false;
      }
    }
  }
  
  ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
        console.log(`Created log directory: ${this.logDir}`);
      }
    } catch (error) {
      console.error(`Failed to create log directory: ${error.message}`);
    }
  }
  
  formatObject(obj) {
    if (obj instanceof Error) {
      return `${obj.message}\n${obj.stack}`;
    }
    
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return String(obj);
    }
  }
  
  log(level, ...args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => 
      typeof arg === 'object' && arg !== null ? this.formatObject(arg) : String(arg)
    ).join(' ');
    
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    // Output to console always
    if (typeof console[level] === 'function') {
      console[level](logEntry.trim());
    } else {
      console.log(logEntry.trim());
    }
    
    // Skip file logging in Homey environment
    if (!this.useFileLogging) {
      return;
    }
    
    // Write to appropriate log file
    try {
      // Ensure log directory exists
      this.ensureLogDirectory();
      
      // Write to specific log files based on level
      if (level === 'debug') {
        fs.appendFileSync(this.debugLogPath, logEntry);
      } else if (level === 'error') {
        fs.appendFileSync(this.exceptionLogPath, logEntry);
      } else if (level === 'warn') {
        // Create a specific log file for warnings
        const warningLogPath = path.join(this.logDir, 'warnings.log');
        fs.appendFileSync(warningLogPath, logEntry);
      }
      
      // Write all logs to main app log
      fs.appendFileSync(this.appLogPath, logEntry);
    } catch (error) {
      // If we encounter an error writing to log files, disable file logging
      // to prevent spamming the console with error messages
      console.error(`Failed to write to log file: ${error.message} - disabling file logging`);
      this.useFileLogging = false;
    }
  }

  info(...args) {
    this.log('info', ...args);
  }

  warn(...args) {
    this.log('warn', ...args);
  }

  error(...args) {
    this.log('error', ...args);
  }

  debug(...args) {
    this.log('debug', ...args);
  }
  
  // Log capability values for easier debugging
  logCapability(deviceName, capabilityId, value) {
    this.debug(`Capability Update: ${deviceName} - ${capabilityId}: ${value}`);
  }
  
  // Log HomeKit service operations
  logService(serviceName, operation, details = {}) {
    this.debug(`HomeKit Service: ${serviceName} - ${operation}`, details);
  }
}

module.exports = new Logger();