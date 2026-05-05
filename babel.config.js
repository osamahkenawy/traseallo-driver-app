module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    'react-native-reanimated/plugin', // must be last
  ],
  env: {
    production: {
      plugins: [
        // Strip console.* (except error/warn) from release bundles
        ['transform-remove-console', {exclude: ['error', 'warn']}],
        'react-native-reanimated/plugin', // must be last
      ],
    },
  },
};
