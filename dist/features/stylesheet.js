"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = Stylesheet;
var _helper = require("../utils/helper");
var _buildTransform = require("./build-transform");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var SUPPORTED_RULE_TYPES = ["rule", "media"];

// Regex for CSS variable detection
var cssVarRe = /^--[\w-]+/;
function Stylesheet() {
  var _this = this;
  // Store raw declarations (before pre-computation)
  this.rawStylesheet = {};
  // Store pre-computed declarations
  this.stylesheet = {};
  var _getSelectorName = function _getSelectorName(selector) {
    if (selector === ":root") return selector;
    return selector.replace(/^\./, "").replace(/\\/g, ""); // remove escape backslash
  };
  var isVar = function isVar(property) {
    return cssVarRe.test(property);
  };
  this.isRuleTypeSupported = function (type) {
    return SUPPORTED_RULE_TYPES.includes(type);
  };
  this.isSelectorSupported = function (selector) {
    if (selector === ":root") return true;
    if (selector.includes(" ")) return false;
    if (!selector.startsWith(".")) return false;
    return true;
  };
  this.simplifyDeclarations = function (declarations) {
    return (declarations || []).reduce(function (res, declaration) {
      if (declaration.type !== "declaration") return res;
      var property = declaration.property,
        value = declaration.value;
      if (isVar(property)) {
        res[property] = value;
      } else {
        res[(0, _helper.camelize)(property)] = value;
      }
      return res;
    }, {});
  };
  this.upsert = function (selector, declarations) {
    var selectorName = _getSelectorName(selector);

    // Merge raw declarations
    _this.rawStylesheet[selectorName] = _objectSpread(_objectSpread({}, _this.rawStylesheet[selectorName]), declarations);
  };
  this.finalize = function () {
    // Pre-compute all declarations at the end
    for (var _i = 0, _Object$entries = Object.entries(_this.rawStylesheet); _i < _Object$entries.length; _i++) {
      var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
        selector = _Object$entries$_i[0],
        rawDecl = _Object$entries$_i[1];
      var _precomputeDeclaratio = (0, _buildTransform.precomputeDeclaration)(rawDecl),
        _static = _precomputeDeclaratio._static,
        _dynamic = _precomputeDeclaratio._dynamic,
        _hasDynamic = _precomputeDeclaratio._hasDynamic;
      if (_hasDynamic) {
        // Has dynamic properties - store both static and dynamic
        _this.stylesheet[selector] = {
          _static: _static,
          _dynamic: _dynamic
        };
      } else {
        // Fully static - just store the static object directly
        _this.stylesheet[selector] = _static;
      }
    }
  };
  this.toJSON = function () {
    // Finalize pre-computation before serializing
    _this.finalize();
    return JSON.stringify(_this.stylesheet);
  };
  return this;
}