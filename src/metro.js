const fs = require("fs");
const path = require("path");

/**
 * withReactNativeCss
 *
 * Plug-and-play zero-configuration helper for Expo and React Native Metro bundler.
 *
 * Automatically:
 * 1. Configures Metro to handle .css files via @colorye/react-native-css/transformer.
 * 2. Connects the high-performance Rust SWC native transformer for JSX/TSX.
 * 3. Adds 'css' to sourceExts.
 * 4. In-process caches and synchronizes stylesheet JSON without manual setup.
 *
 * @param {import('metro-config').MetroConfig} metroConfig
 * @param {Object} [options]
 * @param {string} [options.input] - Input CSS path relative to project root (default: 'src/assets/styles/index.css' or 'index.css')
 * @returns {import('metro-config').MetroConfig}
 */
function withReactNativeCss(metroConfig, options = {}) {
  const config = { ...metroConfig };

  // Ensure resolver & transformer objects exist
  config.resolver = config.resolver || {};
  config.transformer = config.transformer || {};

  // 1. Add 'css' to sourceExts if missing
  const currentSourceExts = config.resolver.sourceExts || [];
  if (!currentSourceExts.includes("css")) {
    config.resolver.sourceExts = [...currentSourceExts, "css"];
  }

  // 2. Wrap or assign babelTransformerPath
  const defaultTransformerPath = config.transformer.babelTransformerPath || require.resolve("./transformer");
  config.transformer.babelTransformerPath = defaultTransformerPath;

  return config;
}

module.exports = {
  withReactNativeCss,
};
