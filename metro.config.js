/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const path = require('path');

module.exports = {
  resolver: {
    // Redirect framer-motion to our RN shim so Moti can resolve it
    extraNodeModules: {
      'framer-motion': path.resolve(__dirname, 'src/shims/framer-motion.js'),
    },
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};
