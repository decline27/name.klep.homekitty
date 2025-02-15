#!/usr/bin/env node

const { homedir } = require('os');
const { join } = require('path');
const { rm } = require('fs/promises');
const { execSync } = require('child_process');

async function resetDev() {
    try {
        // Paths to clear
        const homeySettingsPath = join(homedir(), '.homey/apps/name.klep.homekitty.dev');
        const persistPath = '/userdata/homekitty-persist-dev';

        console.log('🔄 Resetting HomeKitty Development Version...');

        // Remove Homey settings
        try {
            console.log('Clearing Homey settings...');
            await rm(homeySettingsPath, { recursive: true, force: true });
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error clearing Homey settings:', error.message);
            }
        }

        // Remove persist directory
        try {
            console.log('Clearing persist directory...');
            await rm(persistPath, { recursive: true, force: true });
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error clearing persist directory:', error.message);
            }
        }

        // Set HOMEKITTY_RESET environment variable
        process.env.HOMEKITTY_RESET = 'true';

        console.log('✅ Reset complete! You can now restart the app.');
        console.log('To restart, run: homey app run');

    } catch (error) {
        console.error('❌ Error during reset:', error.message);
        process.exit(1);
    }
}

// Run the reset
resetDev();
