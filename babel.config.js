module.exports = function (api) {
  api.cache(true);
  const isTest = process.env.BABEL_ENV === 'test' || process.env.NODE_ENV === 'test';
  
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          ...(isTest ? {} : { jsxImportSource: 'nativewind' }),
          // Legacy architecture (newArchEnabled: false) → Reanimated 3.x.
          // worklets stays installed for NativeWind/css-interop Babel only; native autolinking disabled in react-native.config.js.
          worklets: false,
          reanimated: true,
        },
      ],
      ...(isTest ? [] : ['nativewind/babel']),
    ],
    plugins: [
      // Explicitly add reanimated plugin to ensure it's available
      // This will be added even if babel-preset-expo doesn't add it
      'react-native-reanimated/plugin',
    ],
  };
};
