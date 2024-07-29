"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = CssTransform;
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i["return"] && (_r = _i["return"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
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
  this.transform = function (property, value) {
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
  this.transformBorder = function (property, value) {
    if (value === "none") {
      return _defineProperty({}, "".concat(property, "Width"), 0);
    }
    var borderRe = /(\S+)(?:\s+(solid|dashed|dotted)(?:\s+(\S+))?)?/g;
    var _ref4 = borderRe.exec(value) || [],
      _ref5 = _slicedToArray(_ref4, 4),
      width = _ref5[1],
      style = _ref5[2],
      color = _ref5[3];
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
    var _ref6 = spacingRe.exec(value) || [],
      _ref7 = _slicedToArray(_ref6, 5),
      top = _ref7[1],
      right = _ref7[2],
      bottom = _ref7[3],
      left = _ref7[4];
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
  this.getAliasedPropertyName = function (property) {
    if (property === "background") property = "backgroundColor";
    return property;
  };
  return this;
}