"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
exports.getStylesheet = getStylesheet;
exports.transform = transform;
exports.writeStylesheetJSON = writeStylesheetJSON;
var _fs = _interopRequireDefault(require("fs"));
var _path = _interopRequireDefault(require("path"));
var _stylesheet = _interopRequireDefault(require("./features/stylesheet"));
var _css = require("./utils/css");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function getStylesheet(css, filename) {
  var rawStylesheet = (0, _css.parseStylesheetWithLightning)(css);
  var stylesheet = new _stylesheet["default"]();
  stylesheet.setRawStylesheet(rawStylesheet);
  var jsonContent = stylesheet.toJSON();
  writeStylesheetJSON(jsonContent, filename);
  return jsonContent;
}
function writeStylesheetJSON(content, filename) {
  try {
    var distPath = _path["default"].join(__dirname, "exported-stylesheet.json");
    _fs["default"].writeFileSync(distPath, content, {
      mode: 493
    });
    var srcPath = _path["default"].resolve(__dirname, "../src/exported-stylesheet.json");
    if (_fs["default"].existsSync(_path["default"].dirname(srcPath))) {
      _fs["default"].writeFileSync(srcPath, content, {
        mode: 493
      });
    }
    if (filename) {
      _fs["default"].writeFileSync("".concat(filename, ".json"), content, {
        mode: 493
      });
    }
  } catch (_unused) {
    // Silently fail - Babel will fall back to runtime
  }
}
function transform(_ref) {
  var src = _ref.src,
    filename = _ref.filename,
    options = _ref.options;
  var projectRoot = options && options.projectRoot ? options.projectRoot : process.cwd();
  var resolveTransformer = function () {
    var resolveOptions = {
      paths: [projectRoot]
    };
    try {
      return require(require.resolve("@expo/metro-config/babel-transformer", resolveOptions));
    } catch (error) {
      try {
        return require(require.resolve("@react-native/metro-babel-transformer", resolveOptions));
      } catch (error2) {
        try {
          return require(require.resolve("metro-react-native-babel-transformer", resolveOptions));
        } catch (err) {
          try {
            return require("@expo/metro-config/babel-transformer");
          } catch (e) {
            try {
              return require("@react-native/metro-babel-transformer");
            } catch (e2) {
              try {
                return require("metro-react-native-babel-transformer");
              } catch (e3) {
                throw new Error("Failed to load any upstream babel-transformer. Please ensure either '@expo/metro-config', '@react-native/metro-babel-transformer', or 'metro-react-native-babel-transformer' is installed.");
              }
            }
          }
        }
      }
    }
  }();
  if (filename.endsWith(".css")) {
    var jsonContent = getStylesheet(src, filename);
    return resolveTransformer.transform({
      src: "const sheet = ".concat(jsonContent, ";\nmodule.exports = sheet;\nmodule.exports.default = sheet;\nmodule.exports.__esModule = true;"),
      filename: filename,
      options: options
    });
  }
  return resolveTransformer.transform({
    src: src,
    filename: filename,
    options: options
  });
}
var _default = exports["default"] = {
  transform: transform,
  getStylesheet: getStylesheet,
  writeStylesheetJSON: writeStylesheetJSON
};