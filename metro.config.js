// Metro configuration with NativeWind
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

/**
 * Skip machine-local junk during Metro file-map crawl + resolve.
 * These dirs are gitignored / regenerable and were dominating cold start on
 * KooDrive (especially `.cache` multi-GB Maestro dumps).
 * `resolver.blockList` becomes metro-file-map `ignorePattern`.
 *
 * Do NOT blindly block `/.eas/` — EAS local builds unpack under
 * `.eas/local-build/.../build`, and that absolute path must stay resolvable.
 */
const underEasLocalBuild = /[\/\\]\.eas[\/\\]local-build[\/\\]/.test(__dirname);

const crawlBlockList = [
  /[\/\\]\.cache[\/\\]/,
  /[\/\\]\.dbg[\/\\]/,
  /[\/\\]\.tmp[\/\\]/,
  /[\/\\]\.worktrees[\/\\]/,
  /[\/\\]\.superpowers[\/\\]/,
  /[\/\\]\.xcode-derived-data[\/\\]/,
  /[\/\\]\.maestro[\/\\]/,
  /[\/\\]eas-keystores[\/\\]/,
  ...(underEasLocalBuild ? [] : [/[\/\\]\.eas[\/\\]/]),
];

const existingBlockList = config.resolver.blockList;
config.resolver.blockList = Array.isArray(existingBlockList)
  ? [...crawlBlockList, ...existingBlockList]
  : existingBlockList
    ? [...crawlBlockList, existingBlockList]
    : crawlBlockList;

module.exports = withNativeWind(config, { input: "./global.css" });
