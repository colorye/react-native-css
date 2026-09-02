"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
var RN = {};
try {
  RN = require("react-native");
} catch (_unused) {
  // Safe in Node/Babel build environment
}
var Appearance = RN.Appearance || {
  getColorScheme: function getColorScheme() {
    return "light";
  }
};
var Dimensions = RN.Dimensions || {
  get: function get() {
    return {
      width: 375,
      height: 812
    };
  }
};

// ============================================================================
// Constants
// ============================================================================
var INHERIT_PROPERTIES = ["color", "fontFamily", "fontSize", "fontStyle", "fontWeight", "fontVariant", "letterSpacing", "lineHeight", "textAlign", "textTransform"];

// ============================================================================
// Cached Dimensions and Appearance
// ============================================================================
var cachedDimensions = null;
var cachedColorScheme = null;
var TRANSFORM_CACHE = {};
var currentCacheKey = null;
function getDimensions() {
  if (!cachedDimensions) {
    try {
      var _Dimensions$get;
      cachedDimensions = (Dimensions === null || Dimensions === void 0 || (_Dimensions$get = Dimensions.get) === null || _Dimensions$get === void 0 ? void 0 : _Dimensions$get.call(Dimensions, "window")) || {
        width: 375,
        height: 812
      };
    } catch (_unused2) {
      cachedDimensions = {
        width: 375,
        height: 812
      };
    }
  }
  return cachedDimensions;
}
function getColorScheme() {
  if (cachedColorScheme === null) {
    try {
      var _Appearance$getColorS;
      cachedColorScheme = (Appearance === null || Appearance === void 0 || (_Appearance$getColorS = Appearance.getColorScheme) === null || _Appearance$getColorS === void 0 ? void 0 : _Appearance$getColorS.call(Appearance)) || "light";
    } catch (_unused3) {
      cachedColorScheme = "light";
    }
  }
  return cachedColorScheme;
}
function getCacheKey() {
  var _getDimensions = getDimensions(),
    width = _getDimensions.width,
    height = _getDimensions.height;
  var colorScheme = getColorScheme();
  return "".concat(width, "x").concat(height, ":").concat(colorScheme);
}
function invalidateCache() {
  cachedDimensions = null;
  cachedColorScheme = null;
  TRANSFORM_CACHE = {};
  currentCacheKey = null;
}
function clearCache() {
  TRANSFORM_CACHE = {};
  currentCacheKey = null;
}
try {
  var _Dimensions$addEventL, _Appearance$addChange;
  Dimensions === null || Dimensions === void 0 || (_Dimensions$addEventL = Dimensions.addEventListener) === null || _Dimensions$addEventL === void 0 || _Dimensions$addEventL.call(Dimensions, "change", invalidateCache);
  Appearance === null || Appearance === void 0 || (_Appearance$addChange = Appearance.addChangeListener) === null || _Appearance$addChange === void 0 || _Appearance$addChange.call(Appearance, invalidateCache);
} catch (_unused4) {}

// ============================================================================
// Flatten Style
// ============================================================================
function getFlattenStyle(declarations) {
  if (!Array.isArray(declarations)) {
    return declarations;
  }
  var result = {};
  function merge(item) {
    if (!item) return;
    if (Array.isArray(item)) {
      for (var i = 0; i < item.length; i++) {
        merge(item[i]);
      }
    } else {
      Object.assign(result, item);
    }
  }
  for (var i = 0; i < declarations.length; i++) {
    merge(declarations[i]);
  }
  var borderStyles = ["borderBottomStyle", "borderTopStyle", "borderLeftStyle", "borderRightStyle"];
  for (var _i = 0, _borderStyles = borderStyles; _i < _borderStyles.length; _i++) {
    var bs = _borderStyles[_i];
    if (result[bs] !== undefined) {
      if (result.borderStyle === undefined) {
        result.borderStyle = ["solid", "dotted", "dashed"].includes(result[bs]) ? result[bs] : "solid";
      }
      delete result[bs];
    }
  }
  if (result.borderStyle !== undefined) {
    if (typeof result.borderStyle !== "string" || !["solid", "dotted", "dashed"].includes(result.borderStyle)) {
      delete result.borderStyle;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

// ============================================================================
// Main Native Rust Stylesheet Transform
// ============================================================================
function transformStyles(stylesheet, classNames) {
  if (!stylesheet || !classNames) return undefined;
  if (stylesheet["default"] && _typeof(stylesheet["default"]) === "object" && !stylesheet[":root"]) {
    stylesheet = stylesheet["default"];
  }
  var _getDimensions2 = getDimensions(),
    width = _getDimensions2.width,
    height = _getDimensions2.height;
  var colorScheme = getColorScheme();
  var cacheKey = getCacheKey();
  if (cacheKey !== currentCacheKey) {
    TRANSFORM_CACHE = {};
    currentCacheKey = cacheKey;
  }
  if (TRANSFORM_CACHE[classNames] !== undefined) {
    return TRANSFORM_CACHE[classNames];
  }
  var classes = classNames.trim().split(/\s+/);
  var resolved = {};
  var _iterator = _createForOfIteratorHelper(classes),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var cls = _step.value;
      if (!cls) continue;
      var entry = stylesheet[cls];
      if (!entry) continue;
      if (entry._static) {
        Object.assign(resolved, entry._static);
      } else if (entry._dynamic) {
        Object.assign(resolved, entry._dynamic);
      } else if (_typeof(entry) === "object") {
        Object.assign(resolved, entry);
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  var result = Object.keys(resolved).length > 0 ? resolved : undefined;
  TRANSFORM_CACHE[classNames] = result;
  return result;
}

// ============================================================================
// Inherit Style
// ============================================================================
function getInheritStyle(declarations) {
  if (!declarations) return undefined;
  var inheritDeclarations = {};
  var _iterator2 = _createForOfIteratorHelper(INHERIT_PROPERTIES),
    _step2;
  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var key = _step2.value;
      if (declarations[key] !== undefined) {
        inheritDeclarations[key] = declarations[key];
      }
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  return Object.keys(inheritDeclarations).length > 0 ? inheritDeclarations : undefined;
}

// ============================================================================
// Main Entry Point
// ============================================================================
function getStyle(stylesheet, _ref) {
  var _ref2 = _slicedToArray(_ref, 3),
    inheritStyle = _ref2[0],
    className = _ref2[1],
    style = _ref2[2];
  var inherited = getInheritStyle(getFlattenStyle(inheritStyle));
  var transformed = transformStyles(stylesheet, className);
  var result = getFlattenStyle([inherited, transformed, style]);
  return result;
}

// ============================================================================
// Lightweight Merge for Static Styles
// ============================================================================
function mergeStyles(inheritStyle, staticStyles, inlineStyle) {
  if (!inheritStyle && !inlineStyle) {
    return staticStyles;
  }
  var inherited;
  if (inheritStyle) {
    var flatInherit = getFlattenStyle(inheritStyle);
    if (flatInherit) {
      inherited = {};
      var _iterator3 = _createForOfIteratorHelper(INHERIT_PROPERTIES),
        _step3;
      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var key = _step3.value;
          if (flatInherit[key] !== undefined) {
            inherited[key] = flatInherit[key];
          }
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }
      if (Object.keys(inherited).length === 0) {
        inherited = undefined;
      }
    }
  }
  if (!inherited && !inlineStyle) {
    return staticStyles;
  }
  var result = {};
  if (inherited) Object.assign(result, inherited);
  if (staticStyles) {
    for (var _key in staticStyles) {
      if (!_key.startsWith("--")) {
        result[_key] = staticStyles[_key];
      }
    }
  }
  if (inlineStyle) Object.assign(result, inlineStyle);
  return Object.keys(result).length > 0 ? result : undefined;
}
var _default = exports["default"] = {
  getFlattenStyle: getFlattenStyle,
  getStyle: getStyle,
  getInheritStyle: getInheritStyle,
  mergeStyles: mergeStyles,
  clearCache: clearCache
};