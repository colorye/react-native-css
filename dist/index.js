"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
var _fs = _interopRequireDefault(require("fs"));
var _path = _interopRequireDefault(require("path"));
var _css = require("css");
var _stylesheet = _interopRequireDefault(require("./features/stylesheet"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
var upstreamTransformer = function () {
  try {
    return require("@expo/metro-config/babel-transformer");
  } catch (error) {
    try {
      return require("@react-native/metro-babel-transformer");
    } catch (error) {
      return require("metro-react-native-babel-transformer");
    }
  }
}();
function getStylesheet(css) {
  var ast = (0, _css.parse)(css);
  var stylesheet = new _stylesheet["default"]();
  var _iterator = _createForOfIteratorHelper(ast.stylesheet.rules || []),
    _step;
  try {
    var _loop = function _loop() {
      var rule = _step.value;
      if (!stylesheet.isRuleTypeSupported(rule.type)) return "continue";
      if (rule.type === "rule") {
        var declarations = stylesheet.simplifyDeclarations(rule.declarations);
        rule.selectors.forEach(function (selector) {
          if (!stylesheet.isSelectorSupported(selector)) return;
          stylesheet.upsert(selector, declarations);
        });
      }
    };
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _ret = _loop();
      if (_ret === "continue") continue;
    }

    // all @media will be injected at the end
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  var _iterator2 = _createForOfIteratorHelper(ast.stylesheet.rules || []),
    _step2;
  try {
    var _loop2 = function _loop2() {
      var rule = _step2.value;
      if (!stylesheet.isRuleTypeSupported(rule.type)) return "continue";
      if (rule.type === "media") {
        var _iterator3 = _createForOfIteratorHelper(rule.rules || []),
          _step3;
        try {
          var _loop3 = function _loop3() {
            var mediaRule = _step3.value;
            if (!stylesheet.isRuleTypeSupported(mediaRule.type)) return "continue";
            if (mediaRule.type === "rule") {
              var declarations = stylesheet.simplifyDeclarations(mediaRule.declarations);
              mediaRule.selectors.forEach(function (selector) {
                if (!stylesheet.isSelectorSupported(selector)) return;
                stylesheet.upsert(selector, _defineProperty({}, "@media ".concat(rule.media), declarations));
              });
            }
          };
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var _ret3 = _loop3();
            if (_ret3 === "continue") continue;
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }
      }
    };
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var _ret2 = _loop2();
      if (_ret2 === "continue") continue;
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  if (process.env.NODE_ENV !== "production") {
    debugStylesheets(stylesheet.toJSON());
  }
  return stylesheet.toJSON();
}
function debugStylesheets(content) {
  try {
    var dir = _path["default"].join(__dirname);
    _fs["default"].writeFileSync("".concat(dir, "/exported-stylesheet.json"), content, {
      mode: 493
    });
  } catch (_unused) {}
}
module.exports.transform = function (_ref) {
  var src = _ref.src,
    filename = _ref.filename,
    options = _ref.options;
  if (filename.endsWith(".css")) {
    return upstreamTransformer.transform({
      src: "module.exports = ".concat(getStylesheet(src)),
      filename: filename,
      options: options
    });
  }
  return upstreamTransformer.transform({
    src: src,
    filename: filename,
    options: options
  });
};