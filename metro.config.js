// Metro configuration with NativeWind
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

/**
 * Skip machine-local junk during Metro file-map crawl + resolve.
 * These dirs are gitignored / regenerable and were dominating cold start on
 * KooDrive (especially `.cache` multi-GB Maestro/EAS dumps).
 * `resolver.blockList` becomes metro-file-map `ignorePattern`.
 */
const crawlBlockList = [
  /[\/\\]\.cache[\/\\]/,
  /[\/\\]\.dbg[\/\\]/,
  /[\/\\]\.eas[\/\\]/,
  /[\/\\]\.tmp[\/\\]/,
  /[\/\\]\.worktrees[\/\\]/,
  /[\/\\]\.superpowers[\/\\]/,
  /[\/\\]\.xcode-derived-data[\/\\]/,
  /[\/\\]\.maestro[\/\\]/,
  /[\/\\]eas-keystores[\/\\]/,
];

const existingBlockList = config.resolver.blockList;
config.resolver.blockList = Array.isArray(existingBlockList)
  ? [...crawlBlockList, ...existingBlockList]
  : existingBlockList
    ? [...crawlBlockList, existingBlockList]
    : crawlBlockList;

module.exports = withNativeWind(config, { input: "./global.css" });
