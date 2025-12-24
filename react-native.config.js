module.exports = {
  dependencies: {
    // Exclude react-native-worklets from autolinking to prevent duplicate symbols
    // It's only needed as a dev dependency for Babel to resolve the plugin
    'react-native-worklets': {
      platforms: {
        ios: null, // Disable iOS autolinking
        android: null, // Disable Android autolinking
      },
    },
  },
};


