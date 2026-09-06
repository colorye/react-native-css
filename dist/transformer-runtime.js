"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
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
var Platform = RN.Platform || {
  OS: "ios"
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
  var os = (Platform === null || Platform === void 0 ? void 0 : Platform.OS) || "ios";
  return "".concat(width, "x").concat(height, ":").concat(colorScheme, ":").concat(os);
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
  if (result.opacity !== undefined && typeof result.opacity === "string") {
    var trimmed = result.opacity.trim();
    if (trimmed.endsWith("%")) {
      var num = parseFloat(trimmed);
      if (!isNaN(num)) result.opacity = num / 100;
    } else {
      var _num = parseFloat(trimmed);
      if (!isNaN(_num)) result.opacity = _num;
    }
  }
  if (result.letterSpacing !== undefined && typeof result.letterSpacing === "string") {
    var _trimmed = result.letterSpacing.trim();
    if (_trimmed === "normal") {
      result.letterSpacing = 0;
    } else if (_trimmed === "inherit") {
      delete result.letterSpacing;
    } else if (_trimmed.endsWith("rem") || _trimmed.endsWith("em") && !_trimmed.endsWith("rem")) {
      var _num2 = parseFloat(_trimmed);
      if (!isNaN(_num2)) result.letterSpacing = _num2 * 16;
    } else if (_trimmed.endsWith("px")) {
      var _num3 = parseFloat(_trimmed);
      if (!isNaN(_num3)) result.letterSpacing = _num3;
    } else {
      var _num4 = parseFloat(_trimmed);
      if (!isNaN(_num4)) result.letterSpacing = _num4;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
function resolveCssVars(val, rootVars, localVars) {
  if (typeof val !== "string" || !val.includes("var(")) return val;
  var res = val;
  var iterations = 0;
  while (res.includes("var(") && iterations < 5) {
    iterations++;
    res = res.replace(/var\(\s*(--[a-zA-Z0-9_-]+)(?:\s*,\s*([^)]+))?\s*\)/g, function (_, name, fb) {
      if (localVars && localVars[name] !== undefined) return localVars[name];
      return rootVars[name] !== undefined ? rootVars[name] : fb || "";
    });
  }
  return res;
}
function resolveCssValue(prop, val, rootVars, localVars) {
  if (typeof val !== "string") return val;
  var v = resolveCssVars(val, rootVars, localVars).trim();
  if (prop === "boxShadow") {
    var parts = v.split(/,(?![^(]*\))/).map(function (p) {
      return p.trim();
    }).filter(function (p) {
      return p && !p.includes("0 0 #0000") && !p.includes("0 0 #000") && !p.includes("0 0 0 0");
    });
    if (parts.length === 0) return undefined;
    v = parts.join(", ");
  }
  if (v.startsWith("calc(") && v.endsWith(")")) {
    var inner = v.slice(5, -1).trim();
    inner = inner.replace(/([\d.]+)rem/g, function (_, n) {
      return parseFloat(n) * 16 + "px";
    });
    inner = inner.replace(/px/g, "");
    try {
      v = Function('"use strict"; return (' + inner + ')')();
    } catch (_unused5) {}
  }
  if (typeof v === "string" && v.endsWith("rem")) {
    v = parseFloat(v) * 16;
  } else if (typeof v === "string" && v.endsWith("em") && !v.endsWith("rem")) {
    v = parseFloat(v) * 16;
  } else if (typeof v === "string" && v.endsWith("px")) {
    v = parseFloat(v);
  } else if (typeof v === "string" && (v.endsWith("vh") || v.endsWith("vw"))) {
    v = parseFloat(v) + "%";
  }
  if (prop.toLowerCase().endsWith("radius") && (v === "50%" || v === "9999px" || v === 9999)) {
    return 9999;
  }
  if (prop === "letterSpacing") {
    if (typeof v === "string") {
      var trimmed = v.trim();
      if (trimmed === "normal") return 0;
      if (trimmed === "inherit") return undefined;
      if (trimmed.endsWith("rem")) {
        var _num5 = parseFloat(trimmed);
        if (!isNaN(_num5)) return _num5 * 16;
      }
      if (trimmed.endsWith("em")) {
        var _num6 = parseFloat(trimmed);
        if (!isNaN(_num6)) return _num6 * 16;
      }
      if (trimmed.endsWith("px")) {
        var _num7 = parseFloat(trimmed);
        if (!isNaN(_num7)) return _num7;
      }
      var num = parseFloat(trimmed);
      if (!isNaN(num)) return num;
    } else if (typeof v === "number") {
      return v;
    }
  }
  if (prop === "opacity" || prop.endsWith("Opacity")) {
    if (typeof v === "string") {
      var _trimmed2 = v.trim();
      if (_trimmed2.endsWith("%")) {
        var _num8 = parseFloat(_trimmed2);
        if (!isNaN(_num8)) return _num8 / 100;
      }
      var _num9 = parseFloat(_trimmed2);
      if (!isNaN(_num9)) return _num9;
    } else if (typeof v === "number") {
      return v;
    }
  }
  if (prop === "scale" || prop === "scaleX" || prop === "scaleY") {
    if (typeof v === "string") {
      var _trimmed3 = v.trim();
      if (_trimmed3.endsWith("%")) {
        var _num0 = parseFloat(_trimmed3);
        if (!isNaN(_num0)) return _num0 / 100;
      }
      var _num1 = parseFloat(_trimmed3);
      if (!isNaN(_num1)) return _num1;
    } else if (typeof v === "number") {
      return v;
    }
  }
  if (prop === "fontWeight") {
    return String(v).replace("px", "").replace("rem", "");
  }
  if (typeof v === "string" && !isNaN(Number(v)) && !["color", "fontFamily", "fontWeight"].includes(prop) && !prop.endsWith("Color")) {
    v = Number(v);
  }
  return v;
}
function applyResolvedEntry(resolved, entry, rootVars) {
  if (!entry) return;
  var localVars = {};
  if (entry._static) {
    for (var _i2 = 0, _Object$entries = Object.entries(entry._static); _i2 < _Object$entries.length; _i2++) {
      var _Object$entries$_i = _slicedToArray(_Object$entries[_i2], 2),
        k = _Object$entries$_i[0],
        v = _Object$entries$_i[1];
      if (k.startsWith("--") && typeof v === "string") {
        localVars[k] = v;
      }
    }
  }
  if (entry._static) {
    for (var _i3 = 0, _Object$entries2 = Object.entries(entry._static); _i3 < _Object$entries2.length; _i3++) {
      var _Object$entries2$_i = _slicedToArray(_Object$entries2[_i3], 2),
        _k = _Object$entries2$_i[0],
        _v = _Object$entries2$_i[1];
      if (_k.startsWith("--")) continue;
      var val = resolveCssValue(_k, _v, rootVars, localVars);
      if (val !== undefined && val !== null) {
        resolved[_k] = val;
      }
    }
  }
  if (entry._dynamic) {
    for (var _i4 = 0, _Object$entries3 = Object.entries(entry._dynamic); _i4 < _Object$entries3.length; _i4++) {
      var _Object$entries3$_i = _slicedToArray(_Object$entries3[_i4], 2),
        _k2 = _Object$entries3$_i[0],
        _v2 = _Object$entries3$_i[1];
      if (_k2.startsWith("--")) continue;
      var _val = resolveCssValue(_k2, _v2, rootVars, localVars);
      if (_val !== undefined && _val !== null) {
        resolved[_k2] = _val;
      }
    }
  }
  if (!entry._static && !entry._dynamic) {
    for (var _i5 = 0, _Object$entries4 = Object.entries(entry); _i5 < _Object$entries4.length; _i5++) {
      var _Object$entries4$_i = _slicedToArray(_Object$entries4[_i5], 2),
        _k3 = _Object$entries4$_i[0],
        _v3 = _Object$entries4$_i[1];
      if (_k3.startsWith("--")) continue;
      var _val2 = resolveCssValue(_k3, _v3, rootVars, localVars);
      if (_val2 !== undefined && _val2 !== null) {
        resolved[_k3] = _val2;
      }
    }
  }
}

// ============================================================================
// Main Native Rust Stylesheet Transform
// ============================================================================
function transformStyles(stylesheet, classNames) {
  if (!stylesheet || !classNames) return undefined;
  if (stylesheet["default"] && _typeof(stylesheet["default"]) === "object" && !stylesheet[":root"]) {
    stylesheet = stylesheet["default"];
  }
  var rootVars = stylesheet[":root"] || {};
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
  var os = (Platform === null || Platform === void 0 ? void 0 : Platform.OS) || "ios";
  var _iterator = _createForOfIteratorHelper(classes),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var cls = _step.value;
      if (!cls) continue;

      // Platform variants: ios:, android:, web:
      if (cls.startsWith("ios:")) {
        if (os !== "ios") continue;
        cls = cls.slice(4);
      } else if (cls.startsWith("android:")) {
        if (os !== "android") continue;
        cls = cls.slice(8);
      } else if (cls.startsWith("web:")) {
        if (os !== "web") continue;
        cls = cls.slice(4);
      }

      // Media query variants: sm:, md:, lg:, xl:, 2xl:
      if (cls.startsWith("sm:")) {
        if (width < 640) continue;
        cls = cls.slice(3);
      } else if (cls.startsWith("md:")) {
        if (width < 768) continue;
        cls = cls.slice(3);
      } else if (cls.startsWith("lg:")) {
        if (width < 1024) continue;
        cls = cls.slice(3);
      } else if (cls.startsWith("xl:")) {
        if (width < 1280) continue;
        cls = cls.slice(3);
      } else if (cls.startsWith("2xl:")) {
        if (width < 1536) continue;
        cls = cls.slice(4);
      }

      // Dark / Light variants
      if (cls.startsWith("dark:")) {
        if (colorScheme !== "dark") continue;
        cls = cls.slice(5);
      } else if (cls.startsWith("light:")) {
        if (colorScheme !== "light") continue;
        cls = cls.slice(6);
      }
      var entry = stylesheet[cls];
      if (!entry) continue;
      applyResolvedEntry(resolved, entry, rootVars);
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
  var flat = Array.isArray(declarations) ? getFlattenStyle(declarations) : declarations;
  if (!flat || _typeof(flat) !== "object") return undefined;
  var inheritDeclarations = {};
  var _iterator2 = _createForOfIteratorHelper(INHERIT_PROPERTIES),
    _step2;
  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var key = _step2.value;
      if (flat[key] !== undefined) {
        inheritDeclarations[key] = flat[key];
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
    var flatStatic = Array.isArray(staticStyles) ? getFlattenStyle(staticStyles) : staticStyles;
    if (flatStatic && _typeof(flatStatic) === "object") {
      for (var _key in flatStatic) {
        if (!_key.startsWith("--")) {
          result[_key] = flatStatic[_key];
        }
      }
    }
  }
  if (inlineStyle) {
    var flatInline = Array.isArray(inlineStyle) ? getFlattenStyle(inlineStyle) : inlineStyle;
    if (flatInline && _typeof(flatInline) === "object") {
      Object.assign(result, flatInline);
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
var _default = exports["default"] = {
  getFlattenStyle: getFlattenStyle,
  getStyle: getStyle,
  getInheritStyle: getInheritStyle,
  mergeStyles: mergeStyles,
  clearCache: clearCache
};