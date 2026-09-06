"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = _default;
var _fs = _interopRequireDefault(require("fs"));
var _path = _interopRequireDefault(require("path"));
var _core = require("@babel/core");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
var _native = null;
try {
  _native = require("./native");
} catch (_unused) {
  try {
    _native = require("../crates/transformer");
  } catch (_unused2) {}
}
var libRoot = _path["default"].dirname(__filename);
var stylesheetCache = new Map();
function loadStylesheet(cssPath, fileDir) {
  if (!cssPath) return "{}";
  if (stylesheetCache.has(cssPath)) {
    return stylesheetCache.get(cssPath);
  }
  try {
    var cwd = process.cwd();
    var cleanPath = cssPath.replace(/^@\//, "");
    var candidates = [_path["default"].resolve(cwd, cleanPath), _path["default"].resolve(cwd, cleanPath.endsWith(".json") ? cleanPath : "".concat(cleanPath, ".json")), fileDir ? _path["default"].resolve(fileDir, cssPath) : null, _path["default"].resolve(cwd, "index.css.json"), _path["default"].resolve(cwd, "index.css"), _path["default"].join(libRoot, "exported-stylesheet.json")].filter(Boolean);
    var _iterator = _createForOfIteratorHelper(candidates),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var p = _step.value;
        if (_fs["default"].existsSync(p)) {
          var content = _fs["default"].readFileSync(p, "utf-8");
          var sheetJson = content;
          if (p.endsWith(".css") && _native && _native.compileCss) {
            sheetJson = _native.compileCss(content);
          }
          stylesheetCache.set(cssPath, sheetJson);
          return sheetJson;
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  } catch (_unused3) {}
  return "{}";
}
function _default() {
  return {
    name: "@colorye/react-native-css",
    visitor: {
      Program: {
        enter: function enter(path, state) {
          var _this$opts, _this$opts2, _this$opts3;
          var filename = state.file.opts.filename;
          if (!filename || filename.includes("node_modules")) return;
          var options = {
            paths: ((_this$opts = this.opts) === null || _this$opts === void 0 ? void 0 : _this$opts.paths) || [],
            excludes: ((_this$opts2 = this.opts) === null || _this$opts2 === void 0 ? void 0 : _this$opts2.excludes) || [],
            css: (_this$opts3 = this.opts) === null || _this$opts3 === void 0 ? void 0 : _this$opts3.css
          };
          var normalizedFilename = filename.replace(/\\/g, "/");
          var regex = options.paths.map(function (p) {
            return new RegExp(p);
          });
          var excludesRegex = options.excludes.map(function (p) {
            return new RegExp(p);
          });
          if (options.paths.length > 0 && !regex.some(function (re) {
            return normalizedFilename.match(re) || filename.match(re);
          })) {
            return;
          }
          if (excludesRegex.some(function (re) {
            return normalizedFilename.match(re) || filename.match(re);
          })) {
            return;
          }
          if (!_native || !_native.transformJsx) return;
          var stylesheetJson = loadStylesheet(options.css, filename ? _path["default"].dirname(filename) : null);
          var rawCode = state.file.code;
          try {
            var res = _native.transformJsx(rawCode, {
              filename: filename,
              stylesheetJson: stylesheetJson,
              sourceMaps: false
            });
            if (res && res.code && res.code !== rawCode) {
              var newAst = (0, _core.parseSync)(res.code, {
                filename: filename,
                parserOpts: {
                  plugins: ["jsx", "typescript"]
                },
                configFile: false,
                babelrc: false
              });
              if (newAst && newAst.program) {
                path.replaceWith(newAst.program);
                path.stop();
              }
            }
          } catch (_unused4) {
            // Silently fall back if native transformation fails
          }
        }
      }
    }
  };
}