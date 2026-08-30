const { getDefaultConfig } = require("expo/metro-config");

/** Isolate from repo-root Metro/NativeWind config. */
const config = getDefaultConfig(__dirname);
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

module.exports = config;
