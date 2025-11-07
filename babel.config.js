module.exports = function (api) {
  api.cache(true);
  
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'nativewind',
          // Explicitly disable worklets - our patch should prevent it from being added
          worklets: false,
          reanimated: true,
        },
      ],
      'nativewind/babel',
    ],
    plugins: [
      // Explicitly add reanimated plugin to ensure it's available
      // This will be added even if babel-preset-expo doesn't add it
      'react-native-reanimated/plugin',
    ],
  };
};
