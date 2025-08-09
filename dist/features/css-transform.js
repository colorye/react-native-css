"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = CssTransform;
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
var UNSUPPORTED_PROPERTIES = ["outline"];
var remOrEmUnitRe = /([\d.]+)(?:rem|em)$/g;
function CssTransform() {
  var _this = this;
  this.transformUnsafeValue = function (property, value) {
    if (!_this.isPropertySupported(property, value)) {
      console.info("UNSUPPORTED", property, value);
      return [];
    }
    value = value.trim();
    value = _this.transformImportant(property, value);
    value = _this.transformPosition(property, value);
    value = _this.transformBorderRadius(property, value);
    property = _this.getAliasedPropertyName(property);
    return [property, value];
  };
  this.transformUnsupportedUnit = function (value) {
    if (value === undefined) return value;
    return value.replace(remOrEmUnitRe, function (_, rem) {
      return rem * 16;
    });
  };
  this.transformViewportUnit = function (value) {
    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      width = _ref.width,
      height = _ref.height;
    if (value === undefined) return value;
    if (!width || !height) return value;
    var viewportUnitRe = /^([+-]?[0-9.]+)(vh|vw|vmin|vmax)$/g;
    var dimensionsMap = {
      vw: width,
      vh: height
    };
    return value.replace(viewportUnitRe, function (_, number, unit) {
      return parseFloat(number) * dimensionsMap[unit] / 100;
    });
  };
  this.removeUnit = function (value) {
    if (value === undefined) return value;
    return value.replace(/px/g, "");
  };
  this.isPropertySupported = function (property, value) {
    if (UNSUPPORTED_PROPERTIES.includes(property)) return false;
    if (value === undefined) return false;
    if (!["number", "string"].includes(_typeof(value))) return false;
    return true;
  };
  this.transformImportant = function (property, value) {
    return value.replace(/!important/g, "");
  };
  this.transformPosition = function (property, value) {
    if (property === "position" && value === "fixed") {
      return "absolute";
    }
    return value;
  };
  this.transformBorderRadius = function (property, value) {
    if (property === "borderRadius" && value.includes("%")) {
      return 9999;
    }
    return value;
  };
  this.transformBorder = function (property, value) {
    if (value === "none") {
      return _defineProperty({}, "".concat(property, "Width"), 0);
    }
    var borderRe = /(\S+)(?:\s+(solid|dashed|dotted)(?:\s+(\S+))?)?/g;
    var _ref3 = borderRe.exec(value) || [],
      _ref4 = _slicedToArray(_ref3, 4),
      width = _ref4[1],
      style = _ref4[2],
      color = _ref4[3];
    var transformed = {};
    if (width) {
      transformed["".concat(property, "Width")] = isNaN(width) ? width : Number(width);
    } else {
      transformed["".concat(property, "Width")] = 0;
    }
    if (style) {
      transformed["".concat(property, "Style")] = style;
    }
    if (color) {
      transformed["".concat(property, "Color")] = color;
    }
    return transformed;
  };
  this.transformSpacing = function (property, value) {
    var spacingRe = /\s*(\S+)(?:\s*(\S+)(?:\s*(\S+)(?:\s*(\S+))?)?)?\s*/g;
    var _ref5 = spacingRe.exec(value) || [],
      _ref6 = _slicedToArray(_ref5, 5),
      top = _ref6[1],
      right = _ref6[2],
      bottom = _ref6[3],
      left = _ref6[4];
    var transformed = {};

    // marginHorizontal not support auto
    if (!top) {
      transformed["".concat(property, "Top")] = 0;
      transformed["".concat(property, "Right")] = 0;
      transformed["".concat(property, "Bottom")] = 0;
      transformed["".concat(property, "Left")] = 0;
    } else if (!right) {
      transformed["".concat(property, "Top")] = isNaN(top) ? top : Number(top);
      transformed["".concat(property, "Right")] = isNaN(top) ? top : Number(top);
      transformed["".concat(property, "Bottom")] = isNaN(top) ? top : Number(top);
      transformed["".concat(property, "Left")] = isNaN(top) ? top : Number(top);
    } else if (!bottom) {
      transformed["".concat(property, "Top")] = isNaN(top) ? top : Number(top);
      transformed["".concat(property, "Right")] = isNaN(right) ? right : Number(right);
      transformed["".concat(property, "Bottom")] = isNaN(top) ? top : Number(top);
      transformed["".concat(property, "Left")] = isNaN(right) ? right : Number(right);
    } else if (!left) {
      transformed["".concat(property, "Top")] = isNaN(top) ? top : Number(top);
      transformed["".concat(property, "Right")] = isNaN(right) ? right : Number(right);
      transformed["".concat(property, "Bottom")] = isNaN(bottom) ? bottom : Number(bottom);
      transformed["".concat(property, "Left")] = isNaN(right) ? right : Number(right);
    } else {
      transformed["".concat(property, "Top")] = isNaN(top) ? top : Number(top);
      transformed["".concat(property, "Right")] = isNaN(right) ? right : Number(right);
      transformed["".concat(property, "Bottom")] = isNaN(bottom) ? bottom : Number(bottom);
      transformed["".concat(property, "Left")] = isNaN(left) ? left : Number(left);
    }
    return transformed;
  };
  this.transformFontWeight = function (property, value) {
    var fontWeightRe = /(normal|bold|100|200|300|400|500|600|700|800|900)/g;
    if (!fontWeightRe.test(value)) return;
    return _defineProperty({}, property, value);
  };
  this.transformTransform = function (property, value) {
    var transformRe = /(perspective|rotate|rotateX|rotateY|scale|scaleX|scaleY|translate|translateX|translateY|skew|skewX|skewY)\s*\(\s*([^,)]+)[,\s]*([^)]+)?\)/g;
    var transforms = [];
    var match;
    do {
      match = transformRe.exec(value);
      if (!match) break;
      var _match = match,
        _match2 = _slicedToArray(_match, 4),
        token = _match2[1],
        val1 = _match2[2],
        val2 = _match2[3];
      if (["translate", "skew"].includes(token)) {
        transforms.push(_defineProperty({}, "".concat(token, "X"), isNaN(val1) ? val1 : Number(val1)));
        transforms.push(_defineProperty({}, "".concat(token, "Y"), isNaN(val2) ? val2 : Number(val2)));
      } else {
        transforms.push(_defineProperty({}, token, isNaN(val1) ? val1 : Number(val1)));
      }
    } while (match);
    return _defineProperty({}, property, transforms);
  };
  this.transformFontScaling = function (property, value, _ref9) {
    var width = _ref9.width,
      roundFn = _ref9.roundFn;
    if (!["fontSize", "lineHeight"].includes(property)) return value;

    // Base width for design (iPhone 6/7/8)
    var baseWidth = 375;

    // Calculate scaling factor based on device width
    var scaleFactor = width ? width / baseWidth : 1;
    if (!isNaN(value)) {
      return roundFn(Number(value) * scaleFactor);
    }
    return value;
  };
  this.transform = function (property, value, _ref10) {
    var width = _ref10.width,
      height = _ref10.height;
    if (["border", "borderTop", "borderBottom", "borderLeft", "borderRight"].includes(property)) {
      return _this.transformBorder(property, value);
    }
    if (["padding", "margin"].includes(property)) {
      return _this.transformSpacing(property, value);
    }
    if (["flex"].includes(property)) {
      return {
        flex: parseInt(value)
      };
    }
    if (["fontWeight"].includes(property)) {
      return _this.transformFontWeight(property, value);
    }
    if (["transform"].includes(property)) {
      return _this.transformTransform(property, value);
    }
    return _defineProperty({}, property, isNaN(value) ? value : Number(value));
  };
  this.getAliasedPropertyName = function (property) {
    if (property === "background") property = "backgroundColor";
    return property;
  };
  return this;
}