// Metro configuration with NativeWind
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Expo getDefaultConfig platforms are ios/android only; web needs explicit
// inclusion so App.web.tsx / *.web.* resolve when serving Expo Web.
config.resolver.platforms = Array.from(
  new Set([...(config.resolver.platforms || []), "native", "web", "ios", "android"]),
);

/**
 * Web is served as a classic <script>. Zustand's ESM middleware uses
 * `import.meta.env`, which throws SyntaxError → blank page. Force the CJS
 * build on web (same file react-native already gets via package exports).
 */
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "zustand/middleware") {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "node_modules/zustand/middleware.js"),
    };
  }
  if (typeof defaultResolveRequest === "function") {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

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
  // Marketing media is not JS — keep Metro crawl off these trees on KooDrive.
  rootDir("docs"),
  rootDir("documentation"),
  rootDir("coverage"),
  ...(underEasLocalBuild ? [] : [rootDir(".eas")]),
];

const existingBlockList = config.resolver.blockList;
config.resolver.blockList = Array.isArray(existingBlockList)
  ? [...crawlBlockList, ...existingBlockList]
  : existingBlockList
    ? [...crawlBlockList, existingBlockList]
    : crawlBlockList;

// Watchman sockets fail when HOME lives on KooDrive; force Node crawl + blockList.
config.resolver.useWatchman = false;

module.exports = withNativeWind(config, { input: "./global.css" });
