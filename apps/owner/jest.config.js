const path = require("path");
const root = path.join(__dirname, "../..");

module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.(test|spec).[jt]s?(x)"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|expo|@expo|react-native|@react-native|@react-navigation)/)",
  ],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": [
      path.join(root, "node_modules/babel-jest"),
      {
        presets: [
          [path.join(root, "node_modules/babel-preset-expo"), { jsxRuntime: "automatic" }],
        ],
      },
    ],
  },
};
