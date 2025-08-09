"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = CssVars;
var _cssMedia = _interopRequireDefault(require("./css-media"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
var DEFAULT_VARIABLE_VALUE = 0;
function CssVars() {
  var _this = this;
  this.global = {};
  this.data = {};
  var media = new _cssMedia["default"]();
  this.setGlobal = function (declarations) {
    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      width = _ref.width,
      height = _ref.height;
    for (var property in declarations) {
      var value = declarations[property];
      var _media$match = media.match(property, {
          width: width,
          height: height
        }),
        _media$match2 = _slicedToArray(_media$match, 2),
        isMedia = _media$match2[0],
        matchedMedia = _media$match2[1];
      if (isMedia) {
        if (matchedMedia) {
          _this.setGlobal(value);
        }
        continue;
      }
      if (_this.isVar(property)) {
        _this.global[property] = value;
      }
    }
  };
  this.getGlobal = function () {
    return _this.global;
  };
  this.set = function (selector, declarations) {
    var _ref2 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
      width = _ref2.width,
      height = _ref2.height;
    for (var property in declarations) {
      var value = declarations[property];
      var _media$match3 = media.match(property, {
          width: width,
          height: height
        }),
        _media$match4 = _slicedToArray(_media$match3, 2),
        isMedia = _media$match4[0],
        matchedMedia = _media$match4[1];
      if (isMedia) {
        if (matchedMedia) {
          _this.set(selector, value);
        }
        continue;
      }
      if (_this.isVar(property)) {
        if (!_this.data[selector]) _this.data[selector] = {};
        _this.data[selector][property] = value;
      }
    }
  };
  this.get = function (selector) {
    return _objectSpread(_objectSpread({}, _this.global), _this.data[selector] || {});
  };
  this.isVar = function (property) {
    return /^--\w+/.test(property);
  };
  this.injectVar = function (selector, value) {
    if (value === undefined) return value;
    var variables = _this.get(selector);
    return value.replace(/var\((--[^,)]+)(?:,\s*([^)]+))?\)/g, function (match, variableName, defaultValue) {
      return variables[variableName] || defaultValue || DEFAULT_VARIABLE_VALUE;
    });
  };
  return this;
}