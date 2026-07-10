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
var remOrEmUnitRe = /([\d.]+)(?:rem|em)\b/g;
function CssTransform() {
  var _this = this;
  this.transformUnsafeValue = function (property, value) {
    if (!_this.isPropertySupported(property, value)) {
      console.info("UNSUPPORTED", property, value);
      return [];
    }
    if (typeof value === "string") {
      value = value.trim();
      value = _this.transformImportant(property, value);
    }
    value = _this.transformPosition(property, value);
    value = _this.transformBorderRadius(property, value);
    value = _this.transformOpacity(property, value);
    property = _this.getAliasedPropertyName(property);
    return [property, value];
  };
  this.transformUnsupportedUnit = function (value) {
    if (value === undefined || typeof value !== "string") return value;
    remOrEmUnitRe.lastIndex = 0;
    return value.replace(remOrEmUnitRe, function (_, rem) {
      return rem * 16;
    });
  };
  this.transformViewportUnit = function (value) {
    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      width = _ref.width,
      height = _ref.height;
    if (value === undefined || typeof value !== "string") return value;
    if (!width || !height) return value;
    var viewportUnitRe = /([+-]?[0-9.]+)(vh|vw|vmin|vmax)\b/g;
    var dimensionsMap = {
      vw: width,
      vh: height
    };
    return value.replace(viewportUnitRe, function (_, number, unit) {
      return parseFloat(number) * dimensionsMap[unit] / 100;
    });
  };
  this.removeUnit = function (value) {
    if (value === undefined || typeof value !== "string") return value;
    return value.replace(/px/g, "");
  };
  this.isPropertySupported = function (property, value) {
    if (UNSUPPORTED_PROPERTIES.includes(property)) return false;
    if (value === undefined) return false;
    if (!["number", "string"].includes(_typeof(value))) return false;
    return true;
  };
  this.transformImportant = function (property, value) {
    if (typeof value !== "string") return value;
    return value.replace(/!important/g, "");
  };
  this.transformPosition = function (property, value) {
    if (property === "position" && value === "fixed") {
      return "absolute";
    }
    return value;
  };
  this.transformBorderRadius = function (property, value) {
    if (property.toLowerCase().endsWith("radius") && typeof value === "string" && value.includes("%")) {
      return 9999;
    }
    return value;
  };
  this.transformOpacity = function (property, value) {
    if (property === "opacity" && typeof value === "string" && value.endsWith("%")) {
      var num = parseFloat(value);
      if (!isNaN(num)) {
        return num / 100;
      }
    }
    return value;
  };
  this.transformBorder = function (property, value) {
    if (value === "none") {
      return _defineProperty({}, "".concat(property, "Width"), 0);
    }
    var borderRe = /(\S+)(?:\s+(solid|dashed|dotted)(?:\s+(\S+))?)?/g;
    var _ref3 = borderRe.exec(String(value)) || [],
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
    var strValue = String(value).trim();
    var parts = [];
    var current = "";
    var depth = 0;
    for (var i = 0; i < strValue.length; i++) {
      var _char = strValue[i];
      if (_char === "(") {
        depth++;
        current += _char;
      } else if (_char === ")") {
        depth--;
        current += _char;
      } else if (_char === " " && depth === 0) {
        if (current) {
          parts.push(current);
          current = "";
        }
      } else {
        current += _char;
      }
    }
    if (current) {
      parts.push(current);
    }
    var cleanedParts = parts.filter(Boolean);
    var toNumberOrString = function toNumberOrString(val) {
      return isNaN(val) ? val : Number(val);
    };
    var transformed = {};
    if (cleanedParts.length === 0) {
      transformed["".concat(property, "Top")] = 0;
      transformed["".concat(property, "Right")] = 0;
      transformed["".concat(property, "Bottom")] = 0;
      transformed["".concat(property, "Left")] = 0;
    } else if (cleanedParts.length === 1) {
      var top = cleanedParts[0];
      transformed["".concat(property, "Top")] = toNumberOrString(top);
      transformed["".concat(property, "Right")] = toNumberOrString(top);
      transformed["".concat(property, "Bottom")] = toNumberOrString(top);
      transformed["".concat(property, "Left")] = toNumberOrString(top);
    } else if (cleanedParts.length === 2) {
      var _top = cleanedParts[0];
      var right = cleanedParts[1];
      transformed["".concat(property, "Top")] = toNumberOrString(_top);
      transformed["".concat(property, "Right")] = toNumberOrString(right);
      transformed["".concat(property, "Bottom")] = toNumberOrString(_top);
      transformed["".concat(property, "Left")] = toNumberOrString(right);
    } else if (cleanedParts.length === 3) {
      var _top2 = cleanedParts[0];
      var _right = cleanedParts[1];
      var bottom = cleanedParts[2];
      transformed["".concat(property, "Top")] = toNumberOrString(_top2);
      transformed["".concat(property, "Right")] = toNumberOrString(_right);
      transformed["".concat(property, "Bottom")] = toNumberOrString(bottom);
      transformed["".concat(property, "Left")] = toNumberOrString(_right);
    } else {
      var _top3 = cleanedParts[0];
      var _right2 = cleanedParts[1];
      var _bottom = cleanedParts[2];
      var left = cleanedParts[3];
      transformed["".concat(property, "Top")] = toNumberOrString(_top3);
      transformed["".concat(property, "Right")] = toNumberOrString(_right2);
      transformed["".concat(property, "Bottom")] = toNumberOrString(_bottom);
      transformed["".concat(property, "Left")] = toNumberOrString(left);
    }
    return transformed;
  };
  this.transformFontWeight = function (property, value) {
    var fontWeightRe = /(normal|bold|100|200|300|400|500|600|700|800|900)/g;
    if (!fontWeightRe.test(String(value))) return;
    return _defineProperty({}, property, String(value));
  };
  this.transformTransform = function (property, value) {
    var transformRe = /(perspective|rotate|rotateX|rotateY|scale|scaleX|scaleY|translate|translateX|translateY|skew|skewX|skewY)\s*\(\s*([^,)]+)[,\s]*([^)]+)?\)/g;
    var transforms = [];
    var match;
    var strValue = String(value);
    do {
      match = transformRe.exec(strValue);
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
  this.transformFontScaling = function (property, value, _ref7) {
    var width = _ref7.width,
      roundFn = _ref7.roundFn;
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
  this.transformLogicalProperty = function (property, value) {
    var strValue = String(value).trim();
    var parts = [];
    var current = "";
    var depth = 0;
    for (var i = 0; i < strValue.length; i++) {
      var _char2 = strValue[i];
      if (_char2 === "(") {
        depth++;
        current += _char2;
      } else if (_char2 === ")") {
        depth--;
        current += _char2;
      } else if (_char2 === " " && depth === 0) {
        if (current) {
          parts.push(current);
          current = "";
        }
      } else {
        current += _char2;
      }
    }
    if (current) {
      parts.push(current);
    }
    var cleanedParts = parts.filter(Boolean);
    var toNumberOrString = function toNumberOrString(val) {
      return isNaN(val) ? val : Number(val);
    };
    if (property === "paddingInlineStart") return {
      paddingStart: toNumberOrString(value)
    };
    if (property === "paddingInlineEnd") return {
      paddingEnd: toNumberOrString(value)
    };
    if (property === "marginInlineStart") return {
      marginStart: toNumberOrString(value)
    };
    if (property === "marginInlineEnd") return {
      marginEnd: toNumberOrString(value)
    };
    if (property === "insetInlineStart") return {
      start: toNumberOrString(value)
    };
    if (property === "insetInlineEnd") return {
      end: toNumberOrString(value)
    };
    if (property === "insetBlockStart") return {
      top: toNumberOrString(value)
    };
    if (property === "insetBlockEnd") return {
      bottom: toNumberOrString(value)
    };
    if (property === "paddingInline") {
      if (cleanedParts.length === 1) {
        return {
          paddingHorizontal: toNumberOrString(cleanedParts[0])
        };
      }
      if (cleanedParts.length >= 2) {
        return {
          paddingStart: toNumberOrString(cleanedParts[0]),
          paddingEnd: toNumberOrString(cleanedParts[1])
        };
      }
    }
    if (property === "marginInline") {
      if (cleanedParts.length === 1) {
        return {
          marginHorizontal: toNumberOrString(cleanedParts[0])
        };
      }
      if (cleanedParts.length >= 2) {
        return {
          marginStart: toNumberOrString(cleanedParts[0]),
          marginEnd: toNumberOrString(cleanedParts[1])
        };
      }
    }
    if (property === "paddingBlock") {
      if (cleanedParts.length === 1) {
        return {
          paddingVertical: toNumberOrString(cleanedParts[0])
        };
      }
      if (cleanedParts.length >= 2) {
        return {
          paddingTop: toNumberOrString(cleanedParts[0]),
          paddingBottom: toNumberOrString(cleanedParts[1])
        };
      }
    }
    if (property === "marginBlock") {
      if (cleanedParts.length === 1) {
        return {
          marginVertical: toNumberOrString(cleanedParts[0])
        };
      }
      if (cleanedParts.length >= 2) {
        return {
          marginTop: toNumberOrString(cleanedParts[0]),
          marginBottom: toNumberOrString(cleanedParts[1])
        };
      }
    }
    if (property === "insetInline") {
      if (cleanedParts.length === 1) {
        return {
          left: toNumberOrString(cleanedParts[0]),
          right: toNumberOrString(cleanedParts[0])
        };
      }
      if (cleanedParts.length >= 2) {
        return {
          start: toNumberOrString(cleanedParts[0]),
          end: toNumberOrString(cleanedParts[1])
        };
      }
    }
    if (property === "insetBlock") {
      if (cleanedParts.length === 1) {
        return {
          top: toNumberOrString(cleanedParts[0]),
          bottom: toNumberOrString(cleanedParts[0])
        };
      }
      if (cleanedParts.length >= 2) {
        return {
          top: toNumberOrString(cleanedParts[0]),
          bottom: toNumberOrString(cleanedParts[1])
        };
      }
    }
    return null;
  };
  this.transform = function (property, value, _ref8) {
    var width = _ref8.width,
      height = _ref8.height;
    if (property.toLowerCase().endsWith("radius")) {
      value = _this.transformBorderRadius(property, value);
    }
    if (property === "opacity") {
      value = _this.transformOpacity(property, value);
    }
    if (["paddingInline", "marginInline", "paddingBlock", "marginBlock", "paddingInlineStart", "paddingInlineEnd", "marginInlineStart", "marginInlineEnd", "insetInline", "insetInlineStart", "insetInlineEnd", "insetBlock", "insetBlockStart", "insetBlockEnd"].includes(property)) {
      return _this.transformLogicalProperty(property, value);
    }
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