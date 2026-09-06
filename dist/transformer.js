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
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
var _native = null;
try {
  _native = require("./native");
} catch (_unused) {
  try {
    _native = require("../crates/transformer");
  } catch (_unused2) {}
}
var cachedStylesheet = null;
function getCachedStylesheetJson(projectRoot) {
  if (cachedStylesheet) return cachedStylesheet;
  try {
    var root = projectRoot || process.cwd();
    var candidates = [_path["default"].resolve(root, "index.css.json"), _path["default"].resolve(root, "src/assets/styles/index.css.json"), _path["default"].join(__dirname, "exported-stylesheet.json"), _path["default"].resolve(__dirname, "../src/exported-stylesheet.json")];
    for (var _i = 0, _candidates = candidates; _i < _candidates.length; _i++) {
      var p = _candidates[_i];
      if (_fs["default"].existsSync(p)) {
        cachedStylesheet = _fs["default"].readFileSync(p, "utf-8");
        return cachedStylesheet;
      }
    }
  } catch (_unused3) {}
  return "{}";
}
function getStylesheet(css, filename) {
  if (!_native || !_native.compileCss) {
    throw new Error("[@colorye/react-native-css] Native Rust transformer binding is not loaded. Cannot compile CSS.");
  }
  var jsonContent = _native.compileCss(css);
  cachedStylesheet = jsonContent;
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
  } catch (_unused4) {
    // Silently fail - Babel will fall back to runtime
  }
}
function transform(_ref) {
  var src = _ref.src,
    filename = _ref.filename,
    options = _ref.options;
  var projectRoot = options && options.projectRoot ? options.projectRoot : process.cwd();
  var resolveTransformer = function () {
    try {
      return require("@expo/metro-config/babel-transformer");
    } catch (_unused5) {
      try {
        return require("@react-native/metro-babel-transformer");
      } catch (_unused6) {
        try {
          return require("metro-react-native-babel-transformer");
        } catch (_unused7) {
          var resolveOptions = {
            paths: [projectRoot]
          };
          try {
            var resolved = require.resolve("@expo/metro-config/babel-transformer", resolveOptions);
            return eval("require")(resolved);
          } catch (_unused8) {
            try {
              var _resolved = require.resolve("@react-native/metro-babel-transformer", resolveOptions);
              return eval("require")(_resolved);
            } catch (_unused9) {
              try {
                var _resolved2 = require.resolve("metro-react-native-babel-transformer", resolveOptions);
                return eval("require")(_resolved2);
              } catch (_unused0) {
                return null;
              }
            }
          }
        }
      }
    }
  }();
  if (filename.endsWith(".css")) {
    var jsonContent = getStylesheet(src, filename);
    var cssCode = "const sheet = ".concat(jsonContent, ";\nmodule.exports = sheet;\nmodule.exports.default = sheet;\nmodule.exports.__esModule = true;");
    if (resolveTransformer && resolveTransformer.transform) {
      return resolveTransformer.transform({
        src: cssCode,
        filename: filename,
        options: options
      });
    }
    return {
      code: cssCode,
      map: null
    };
  }

  // Fast native Rust SWC transformer for JSX/TSX
  if (_native && _native.transformJsx && (filename.endsWith(".tsx") || filename.endsWith(".jsx")) && !filename.includes("node_modules")) {
    try {
      var stylesheetJson = (options === null || options === void 0 ? void 0 : options.stylesheetJson) || getCachedStylesheetJson(projectRoot);
      var res = _native.transformJsx(src, {
        filename: filename,
        stylesheetJson: stylesheetJson,
        sourceMaps: true
      });
      if (res && res.code) {
        src = res.code;
      }
    } catch (_unused1) {
      // Graceful fallback to Babel if native transform hits unexpected syntax
    }
  }
  if (resolveTransformer && resolveTransformer.transform) {
    return resolveTransformer.transform({
      src: src,
      filename: filename,
      options: options
    });
  }
  return {
    code: src,
    map: null
  };
}
var _default = exports["default"] = {
  transform: transform,
  getStylesheet: getStylesheet,
  writeStylesheetJSON: writeStylesheetJSON
};