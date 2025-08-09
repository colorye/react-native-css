"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = Stylesheet;
var _helper = require("../utils/helper");
var _cssVars = _interopRequireDefault(require("./css-vars"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var SUPPORTED_RULE_TYPES = ["rule", "media"];
function Stylesheet() {
  var _this = this;
  this.stylesheet = {};
  var vars = new _cssVars["default"]();
  var _getSelectorName = function _getSelectorName(selector) {
    if (selector === ":root") return selector;
    return selector.replace(/^\./, "").replace(/\\/g, ""); // remove escape backslash
  };
  this.isRuleTypeSupported = function (type) {
    if (SUPPORTED_RULE_TYPES.includes(type)) return true;
    return false;
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
      if (vars.isVar(property)) {
        res[property] = value;
      } else {
        res[(0, _helper.camelize)(property)] = value;
      }
      return res;
    }, {});
  };
  this.upsert = function (selector, declarations) {
    var selectorName = _getSelectorName(selector);
    _this.stylesheet[selectorName] = _objectSpread(_objectSpread({}, _this.stylesheet[selectorName]), declarations);
  };
  this.toJSON = function () {
    return JSON.stringify(_this.stylesheet);
  };
  return this;
}