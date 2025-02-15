const DeviceMapper = require('../lib/device-mapper');
const { Service, Characteristic } = require('../modules/hap-nodejs');

// Initialize mapper characteristics
require('../lib/mapper-characteristics')(DeviceMapper);

// Create video doorbell map
DeviceMapper.createMap({
    name: 'video-doorbell',
    class: ['doorbell'],
    category: 5, // Doorbell category
    service: Service.Doorbell,
    required: {
        'NTFY_PRESS_DOORBELL': [{
            service: Service.Doorbell,
            characteristic: Characteristic.ProgrammableSwitchEvent
        }],
        'onoff': [{
            service: Service.Doorbell,
            characteristic: Characteristic.Active
        }]
    },
    optional: {
        'CMD_DOORBELL_QUICK_RESPONSE': [{
            service: Service.Doorbell,
            characteristic: Characteristic.TargetPosition
        }],
        'measure_temperature': [{
            service: Service.TemperatureSensor,
            characteristic: Characteristic.CurrentTemperature
        }],
        'NTFY_MOTION_DETECTION': [{
            service: Service.MotionSensor,
            characteristic: Characteristic.MotionDetected
        }],
        'NTFY_FACE_DETECTION': [{
            service: Service.CameraOperatingMode,
            characteristic: Characteristic.EventSnapshotsActive
        }],
        'NTFY_PET_DETECTED': [{
            service: Service.CameraOperatingMode,
            characteristic: Characteristic.HomeKitCameraActive
        }],
        'NTFY_VEHICLE_DETECTED': [{
            service: Service.CameraOperatingMode,
            characteristic: Characteristic.NightVision
        }],
        'measure_battery': [{
            service: Service.Battery,
            characteristic: Characteristic.BatteryLevel
        }]
    }
});

// Example device structure for testing
const testDevices = {
    'doorbell-1': {
        id: 'doorbell-1',
        name: 'Front Door Camera',
        class: 'doorbell',
        capabilities: [
            'onoff',
            'CMD_DOORBELL_QUICK_RESPONSE',
            'measure_temperature',
            'NTFY_MOTION_DETECTION',
            'NTFY_FACE_DETECTION',
            'NTFY_PET_DETECTED',
            'NTFY_VEHICLE_DETECTED',
            'NTFY_PRESS_DOORBELL',
            'measure_battery'
        ],
        ui: {
            components: [
                {
                    type: 'sensor',
                    capabilities: ['measure_temperature', 'measure_battery']
                },
                {
                    type: 'button',
                    capabilities: ['onoff', 'CMD_DOORBELL_QUICK_RESPONSE']
                }
            ]
        },
        capabilitiesObj: {
            'onoff': { id: 'onoff', type: 'boolean' },
            'CMD_DOORBELL_QUICK_RESPONSE': { id: 'CMD_DOORBELL_QUICK_RESPONSE', type: 'enum' },
            'measure_temperature': { id: 'measure_temperature', type: 'number' },
            'NTFY_MOTION_DETECTION': { id: 'NTFY_MOTION_DETECTION', type: 'boolean' },
            'NTFY_FACE_DETECTION': { id: 'NTFY_FACE_DETECTION', type: 'boolean' },
            'NTFY_PET_DETECTED': { id: 'NTFY_PET_DETECTED', type: 'boolean' },
            'NTFY_VEHICLE_DETECTED': { id: 'NTFY_VEHICLE_DETECTED', type: 'boolean' },
            'NTFY_PRESS_DOORBELL': { id: 'NTFY_PRESS_DOORBELL', type: 'boolean' },
            'measure_battery': { id: 'measure_battery', type: 'number' }
        }
    }
};

function listDevices() {
    console.log('\n=== Device Mapping Analysis ===\n');
    
    for (const [id, device] of Object.entries(testDevices)) {
        console.log(`\n📱 Device: ${device.name || 'Unnamed'} (${device.class || 'Unknown Class'})`);
        console.log(`   ID: ${id}`);
        
        // List capabilities
        if (device.capabilities && device.capabilities.length > 0) {
            console.log('\n   🔧 Capabilities:');
            for (const capability of device.capabilities) {
                const capObj = device.capabilitiesObj[capability];
                console.log(`      - ${capability} (${capObj?.type || 'unknown type'})`);
            }
        }
        
        // List UI components if available
        if (device.ui && device.ui.components) {
            console.log('\n   🎯 UI Components:');
            device.ui.components.forEach(component => {
                console.log(`      - Type: ${component.type}`);
                if (component.capabilities) {
                    console.log(`        Capabilities: ${component.capabilities.join(', ')}`);
                }
            });
        }
        
        // Try to map the device
        const mappedDevice = DeviceMapper.mapDevice(device);
        console.log(`\n   🔌 Can be mapped to HomeKit: ${mappedDevice ? '✅' : '❌'}`);
        
        if (mappedDevice) {
            console.log('   📦 Mapped Services:');
            try {
                const accessory = mappedDevice.accessorize();
                if (accessory && accessory.services) {
                    accessory.services.forEach(service => {
                        console.log(`      - ${service.displayName || service.name || 'Unnamed Service'}`);
                        if (service.characteristics) {
                            console.log('        Characteristics:');
                            service.characteristics.forEach(char => {
                                console.log(`          · ${char.displayName || char.name || 'Unnamed Characteristic'}`);
                            });
                        }
                    });
                }
            } catch (error) {
                console.log(`   ⚠️  Error accessorizing: ${error.message}`);
            }
        }
        
        console.log('\n   ----------------------------------------');
    }
}

// Run the function
listDevices();
