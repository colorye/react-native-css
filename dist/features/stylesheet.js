"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = Stylesheet;
var _helper = require("../utils/helper");
var _cssVars = _interopRequireDefault(require("./css-vars"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
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