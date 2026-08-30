const path = require("path");

let nativeBinding = null;
try {
  nativeBinding = require("./transformer.node");
} catch (e) {
  try {
    nativeBinding = require(path.join(__dirname, "target/release/libcolorye_react_native_css_transformer.dylib"));
  } catch (err) {
    throw new Error(`Failed to load native binding: ${e.message}\n${err.message}`);
  }
}

module.exports = {
  transformJsx: nativeBinding.transformJsx,
};
