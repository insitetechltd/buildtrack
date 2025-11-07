// Metro configuration with NativeWind
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Use default configuration without blocking files
module.exports = withNativeWind(config, { input: './global.css' });

