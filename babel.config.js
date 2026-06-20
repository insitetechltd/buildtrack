module.exports = function (api) {
  api.cache(true);
  const isTest = process.env.BABEL_ENV === 'test' || process.env.NODE_ENV === 'test';
  
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          ...(isTest ? {} : { jsxImportSource: 'nativewind' }),
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
