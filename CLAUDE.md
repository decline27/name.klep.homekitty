# HomeKitty - Homey to HomeKit Bridge

HomeKitty bridges Homey devices to HomeKit, allowing you to control your Homey devices through Apple HomeKit and Siri.

## Development Commands
- No explicit build/test commands (Homey app without build process)
- Run the app with file logging: `./run-with-logging.sh`
- Debugging: Check log files in the `/logs` directory:
  - `app.log`: All logs combined
  - `debug.log`: Debug-level messages only
  - `warnings.log`: Warning messages only
  - `exceptions.log`: Error messages only
  - `terminal.log`: Complete terminal output
- TypeScript types: Using `@types/homey` and `@types/node`

## Code Style Guidelines
- **Naming**: PascalCase for classes, camelCase for methods/functions, UPPER_SNAKE_CASE for constants
- **Private fields**: Use # prefix for private class fields (e.g., `#api`, `#bridge`)
- **Formatting**: 2-space indentation, aligned variable declarations
- **Imports**: Use destructuring for Node.js modules (`const { join } = require('node:path')`)
- **Error handling**: Consistent try/catch with detailed logging using custom Logger
- **Documentation**: Extensive markdown docs in `/documentation` folder
- **Architecture**: Modular design with mapper pattern for device integration
- **Promises**: Heavy use of async/await pattern with proper error handling

## Error Handling Practices
- Use structured logging with the Logger or EnhancedLogger classes
- All asynchronous code should have try/catch blocks with proper error logging
- Use the global unhandled promise rejection handler in app.js for capturing unexpected errors
- Implement retries with exponential backoff for transient API errors
- Device capability subscriptions use CapabilityObserver for better reliability
- All errors affecting user experience should be shown in the logs with appropriate context
- API subscription timeouts are gracefully handled without crashing the application

## Project Structure
- `/lib`: Core integration logic and device mappers
  - `/lib/maps`: Individual device type mapping strategies
  - `/lib/logger.js`: Custom logging system
  - `/lib/enhanced-logger.js`: Advanced structured logging implementation
  - `/lib/capability-observer.js`: Efficient capability subscription management
  - `/lib/device-state-manager.js`: Reliable device state tracking with recovery
  - `/lib/device-registry.js`: Central device registration and tracking system  
- `/modules`: HAP-NodeJS and Homey API integrations
- `/documentation`: Comprehensive project documentation
- `/drivers`: Virtual device implementations
- `/logs`: Log files directory (created at runtime)