// Test script to verify file logging is working
const Logger = require('./lib/logger');
const fs = require('fs');
const path = require('path');

// Create a unique session ID for this test
const sessionId = Math.random().toString(36).substring(2, 10);
const timestamp = new Date().toISOString();

console.log("======================================================");
console.log(`Starting file logging test session ${sessionId} at ${timestamp}`);
console.log(`Current working directory: ${process.cwd()}`);
console.log("======================================================");

// Log to all levels
Logger.info(`[TEST-${sessionId}] This is an INFO test message`);
Logger.warn(`[TEST-${sessionId}] This is a WARNING test message`);
Logger.error(`[TEST-${sessionId}] This is an ERROR test message`);
Logger.debug(`[TEST-${sessionId}] This is a DEBUG test message`);

// Log a complex object
Logger.info(`[TEST-${sessionId}] Object test:`, {
  test: 'data',
  nested: {
    value: 123,
    array: [1, 2, 3]
  }
});

// Verify log files exist and their contents
const mainLogDir = path.join(process.cwd(), 'logs');
const buildLogDir = path.join(process.cwd(), '.homeybuild', 'logs');

// List all possible log locations
const logDirs = [
  { name: 'Main', path: mainLogDir },
  { name: 'Build', path: buildLogDir }
];

// Define log files in each directory
const logFiles = {
  app: 'app.log',
  debug: 'debug.log',
  warnings: 'warnings.log',
  exceptions: 'exceptions.log'
};

// Check all log directories
console.log("\nChecking log directories and files:");

logDirs.forEach(dir => {
  console.log(`\nChecking log directory: ${dir.name}`);
  
  if (fs.existsSync(dir.path)) {
    console.log(`✅ Log directory exists: ${dir.path}`);
    
    // Check log files in this directory
    Object.entries(logFiles).forEach(([type, fileName]) => {
      const filePath = path.join(dir.path, fileName);
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ ${type}.log exists: ${filePath} (${stats.size} bytes)`);
        
        try {
          // Show the last 5 lines of each log file
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim().length > 0);
          const lastLines = lines.slice(-5);
          
          console.log(`   Last entries in ${type}.log:`);
          lastLines.forEach(line => console.log(`   ${line}`));
        } catch (err) {
          console.log(`   Error reading file: ${err.message}`);
        }
      } else {
        console.log(`❌ ${type}.log does not exist: ${filePath}`);
      }
    });
  } else {
    console.log(`❌ Log directory does not exist: ${dir.path}`);
  }
});

console.log("\n======================================================");
console.log(`File logging test complete for session ${sessionId}`);
console.log("======================================================");