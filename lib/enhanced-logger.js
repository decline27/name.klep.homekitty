// enhanced-logger.js - Improved logging system with structured logs and better error handling

const fs = require('fs');
const path = require('node:path');

/**
 * Enhanced logging system with better error handling, structured logs,
 * and proper log file management
 */
class EnhancedLogger {
  /**
   * Create a new EnhancedLogger
   * @param {Object} options - Logger configuration options
   */
  constructor(options = {}) {
    this.logLevel = options.logLevel || 'info';
    this.logDir = options.logDir || './logs';
    this.logFilePath = options.logFilePath || path.join(this.logDir, 'app.log');
    this.errorLogPath = options.errorLogPath || path.join(this.logDir, 'exceptions.log');
    this.debugLogPath = options.debugLogPath || path.join(this.logDir, 'debug.log');
    this.warningLogPath = options.warningLogPath || path.join(this.logDir, 'warnings.log');
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
    this.maxConsoleEntries = options.maxConsoleEntries || 200; // For limiting long outputs
    
    // Create log directory if it doesn't exist
    this.ensureLogDirectory();
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.error(`[ERROR] Failed to create log directory: ${error.message}`);
    }
  }

  /**
   * Check if a message should be logged based on current log level
   * @param {string} level - Log level
   * @returns {boolean} - True if message should be logged
   */
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  /**
   * Format a log entry
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   * @returns {string} - Formatted log entry
   */
  formatEntry(level, message, data = null) {
    const timestamp = new Date().toISOString();
    
    // Process data objects
    let processedData = data;
    if (data instanceof Error) {
      processedData = {
        name: data.name,
        message: data.message,
        stack: data.stack
      };
    } else if (typeof data === 'object' && data !== null) {
      try {
        // Clone to avoid circular reference issues
        processedData = JSON.parse(JSON.stringify(data));
      } catch (error) {
        processedData = { error: 'Unable to stringify object', originalType: typeof data };
      }
    }

    const entry = {
      timestamp,
      level: level.toUpperCase(),
      message: String(message)
    };

    if (processedData !== null) {
      entry.data = processedData;
    }

    return JSON.stringify(entry);
  }

  /**
   * Format a log entry for console display
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   * @returns {string} - Formatted console entry
   */
  formatConsoleEntry(level, message, data = null) {
    const timestamp = new Date().toISOString();
    let dataStr = '';

    if (data !== null) {
      if (data instanceof Error) {
        dataStr = ` ${data.message}${data.stack ? '\\n' + data.stack : ''}`;
      } else if (typeof data === 'object') {
        try {
          const jsonStr = JSON.stringify(data);
          dataStr = jsonStr.length > this.maxConsoleEntries ? 
            ` ${jsonStr.substring(0, this.maxConsoleEntries)}... (truncated)` : 
            ` ${jsonStr}`;
        } catch (error) {
          dataStr = ' [Complex Object]';
        }
      } else {
        dataStr = ` ${data}`;
      }
    }

    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  /**
   * Write to a log file, with rotation if needed
   * @param {string} filePath - Path to log file
   * @param {string} entry - Log entry
   */
  writeToFile(filePath, entry) {
    try {
      // Check if file exists and size
      let shouldRotate = false;
      try {
        const stats = fs.statSync(filePath);
        shouldRotate = stats.size > this.maxFileSize;
      } catch (e) {
        // File doesn't exist, no need to rotate
      }

      // Rotate if needed
      if (shouldRotate) {
        const rotatedPath = `${filePath}.${Date.now()}.old`;
        fs.renameSync(filePath, rotatedPath);
      }

      // Append to file
      fs.appendFileSync(filePath, entry + '\\n');
    } catch (error) {
      console.error(`Failed to write to log file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  log(level, message, data = null) {
    if (!this.shouldLog(level)) return;
    
    const entry = this.formatEntry(level, message, data);
    const consoleEntry = this.formatConsoleEntry(level, message, data);
    
    // Output to console
    if (level === 'error') {
      console.error(consoleEntry);
    } else if (level === 'warn') {
      console.warn(consoleEntry);
    } else if (level === 'debug') {
      console.debug(consoleEntry);
    } else {
      console.log(consoleEntry);
    }
    
    // Write to appropriate log file
    let specificLogFile;
    
    // Determine specific log file based on level
    if (level === 'error') {
      specificLogFile = this.errorLogPath;
    } else if (level === 'debug') {
      specificLogFile = this.debugLogPath;
    } else if (level === 'warn') {
      specificLogFile = this.warningLogPath;
    } else {
      specificLogFile = null;
    }
    
    // Always write to main log
    this.writeToFile(this.logFilePath, entry);
    
    // Also write to specific log file if different from main log
    if (specificLogFile && specificLogFile !== this.logFilePath) {
      this.writeToFile(specificLogFile, entry);
    }
  }

  /**
   * Log an error message
   * @param {string} message - Error message
   * @param {Error|Object} error - Error object or additional data
   */
  error(message, error = null) {
    this.log('error', message, error);
  }

  /**
   * Log a warning message
   * @param {string} message - Warning message
   * @param {Object} data - Additional data
   */
  warn(message, data = null) {
    this.log('warn', message, data);
  }

  /**
   * Log an info message
   * @param {string} message - Info message
   * @param {Object} data - Additional data
   */
  info(message, data = null) {
    this.log('info', message, data);
  }

  /**
   * Log a debug message
   * @param {string} message - Debug message
   * @param {Object} data - Additional data
   */
  debug(message, data = null) {
    this.log('debug', message, data);
  }
}

module.exports = EnhancedLogger;