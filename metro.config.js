// Metro configuration with NativeWind
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

/**
 * Skip machine-local junk during Metro file-map crawl + resolve.
 * These dirs are gitignored / regenerable and were dominating cold start on
 * KooDrive (especially repo-root `.cache` multi-GB Maestro dumps).
 * `resolver.blockList` becomes metro-file-map `ignorePattern`.
 *
 * Patterns must be rooted at `__dirname`:
 * - Do NOT match package caches like `node_modules/react-native-css-interop/.cache/`
 *   (EAS archive needs SHA-1 for those files).
 * - Do NOT blindly block `/.eas/` when the project root already lives under
 *   `.eas/local-build/.../build` (eager bundle must resolve `index.ts`).
 */
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const root = escapeRegExp(__dirname);
const underEasLocalBuild = /[\/\\]\.eas[\/\\]local-build[\/\\]/.test(__dirname);
const rootDir = (name) => new RegExp(`^${root}[\\/\\\\]${escapeRegExp(name)}[\\/\\\\]`);

const crawlBlockList = [
  rootDir(".cache"),
  rootDir(".dbg"),
  rootDir(".tmp"),
  rootDir(".worktrees"),
  rootDir(".superpowers"),
  rootDir(".xcode-derived-data"),
  rootDir(".maestro"),
  rootDir("eas-keystores"),
  ...(underEasLocalBuild ? [] : [rootDir(".eas")]),
];

const existingBlockList = config.resolver.blockList;
config.resolver.blockList = Array.isArray(existingBlockList)
  ? [...crawlBlockList, ...existingBlockList]
  : existingBlockList
    ? [...crawlBlockList, existingBlockList]
    : crawlBlockList;

module.exports = withNativeWind(config, { input: "./global.css" });
