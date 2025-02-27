# Development Setup Guide

This guide helps developers set up their environment for working on the HomeKitty project.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or later)
- **npm** (v6 or later)
- **Git** for version control

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/com.dec.homekitty.git
cd com.dec.homekitty
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies defined in `package.json`.

## Development Tools

### Logging Configuration

HomeKitty includes a robust logging system for development:

1. **Run with Enhanced Logging**:
   ```bash
   ./run-with-logging.sh
   ```
   This script enables comprehensive file logging and shows a log summary after execution.

2. **Log Files**:
   Log files are stored in the `/logs` directory:
   - `app.log`: All application logs
   - `debug.log`: Debug-level messages
   - `warnings.log`: Warning messages
   - `exceptions.log`: Error messages
   - `terminal.log`: Complete terminal output

### TypeScript Types

The project uses TypeScript type definitions for better development experience:

- Homey types are available in `node_modules/@types/homey`
- Node.js types are available in `node_modules/@types/node`

To leverage type checking in your editor, configure it to use these type definitions.

## Project Structure

### Core Components

- `app.js`: Main application entry point
- `/lib`: Core library code
  - `/lib/maps`: Device mapping definitions
  - `/lib/logger.js`: Logging system
  - `/lib/device-mapper.js`: Device mapping system
  - `/lib/mapped-device.js`: Device representation
  - `/lib/mapper-base.js`: Base class for mappers
- `/modules`: External integrations
  - `/modules/hap-nodejs`: HomeKit Accessory Protocol
  - `/modules/homey-api`: Homey API integration

### Documentation

- `/documentation`: Project documentation
  - Comprehensive guides on architecture and components
  - Debugging and error handling documentation
  - Integration guides for different device types

## Development Workflow

### 1. Running the Application

To run the application locally:

```bash
homey app run
```

This command runs the app in development mode, allowing you to test changes.

For enhanced logging during development:

```bash
./run-with-logging.sh
```

### 2. Testing Changes

After making changes:

1. Verify syntax and structure
2. Check for errors in the console
3. Test device functionality with real or virtual devices
4. Validate HomeKit integration

### 3. Code Style Guidelines

Follow the project's established style:

- Use PascalCase for classes (e.g., `DeviceMapper`)
- Use camelCase for variables and functions (e.g., `mapDevice`)
- Use UPPER_SNAKE_CASE for constants (e.g., `DEFAULT_PIN_CODE`)
- Use # prefix for private class fields (e.g., `#bridge`)
- Add JSDoc comments for functions and complex code sections
- Use 2-space indentation for consistency

### 4. Creating Mappers

When creating new device mappers:

1. Use the BaseMapper class for new mappers
2. Follow the pattern in existing "-improved" mappers
3. Ensure proper error handling
4. Validate all values before passing to HomeKit
5. Document the mapper's purpose and capabilities

Example:
```javascript
const myMapper = new BaseMapper(
  ['my-device-class'],
  Service.Switch,
  {
    requiredMatchPercentage: 40,
    name: 'My Device Mapper'
  }
);

myMapper.addRequiredCapability('onoff', {
  characteristics: Characteristic.On,
  get: (value) => !!value,
  set: (value) => !!value
});

return myMapper.build();
```

## Debugging

### Common Issues

1. **Device Mapping Failures**:
   - Check the device's capabilities match the mapper's requirements
   - Review the required match percentage
   - Look for capability naming differences

2. **Subscription Timeouts**:
   - These are logged as warnings and handled automatically
   - Check device connectivity if they persist
   - Verify the device is online and accessible

3. **HomeKit Characteristic Errors**:
   - Ensure values are within HomeKit's allowed ranges
   - Add validation to fix out-of-range values
   - Check for null or undefined values

### Advanced Debugging

1. **Enable Debug Logging**:
   - Set `logLevel` to 'debug' in the logger
   - Check `debug.log` for detailed information

2. **Checking Device Capabilities**:
   - Open app.js and add `console.log(device.capabilities)` in the device discovery handler
   - Match these capabilities against your mapper's requirements

3. **Service Conflicts**:
   - Use `device-mapper.js` to debug service type conflicts
   - Check for duplicate service UUIDs
   - Ensure serviceId is unique for each service type

## Contributing

When contributing to this project:

1. Create a feature branch for your changes
2. Follow the code style guidelines
3. Add appropriate documentation
4. Test thoroughly before submitting
5. Submit a pull request with a clear description

## Additional Resources

- [Homey Developer Documentation](https://developer.athom.com/)
- [HAP-NodeJS Documentation](https://github.com/homebridge/HAP-NodeJS)
- [HomeKit Accessory Protocol Specification](https://developer.apple.com/homekit/)