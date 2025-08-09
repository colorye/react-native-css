"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
var _fs = _interopRequireDefault(require("fs"));
var _path = _interopRequireDefault(require("path"));
var _css = require("css");
var _stylesheet = _interopRequireDefault(require("./features/stylesheet"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
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
      if (!stylesheet.isRuleTypeSupported(rule.type)) return 1; // continue
      if (rule.type === "rule") {
        var declarations = stylesheet.simplifyDeclarations(rule.declarations);
        rule.selectors.forEach(function (selector) {
          if (!stylesheet.isSelectorSupported(selector)) return;
          stylesheet.upsert(selector, declarations);
        });
      }
    };
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      if (_loop()) continue;
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
      if (!stylesheet.isRuleTypeSupported(rule.type)) return 1; // continue
      if (rule.type === "media") {
        var _iterator3 = _createForOfIteratorHelper(rule.rules || []),
          _step3;
        try {
          var _loop3 = function _loop3() {
            var mediaRule = _step3.value;
            if (!stylesheet.isRuleTypeSupported(mediaRule.type)) return 1; // continue
            if (mediaRule.type === "rule") {
              var declarations = stylesheet.simplifyDeclarations(mediaRule.declarations);
              mediaRule.selectors.forEach(function (selector) {
                if (!stylesheet.isSelectorSupported(selector)) return;
                stylesheet.upsert(selector, _defineProperty({}, "@media ".concat(rule.media), declarations));
              });
            }
          };
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            if (_loop3()) continue;
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }
      }
    };
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      if (_loop2()) continue;
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