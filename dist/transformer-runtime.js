"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _cssCalc = _interopRequireDefault(require("./features/css-calc"));
var _cssMedia = _interopRequireDefault(require("./features/css-media"));
var _cssTransform = _interopRequireDefault(require("./features/css-transform"));
var _cssVars = _interopRequireDefault(require("./features/css-vars"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
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
var PixelRatio = RN.PixelRatio || {
  roundToNearestPixel: function roundToNearestPixel(n) {
    return n;
  }
};
// ============================================================================
// Constants
// ============================================================================
var INHERIT_PROPERTIES = ["color", "fontFamily", "fontSize", "fontStyle", "fontWeight", "fontVariant", "letterSpacing", "lineHeight", "textAlign", "textTransform"];

// ============================================================================
// Singleton Helper Instances
// ============================================================================
var vars = new _cssVars["default"]();
var transform = new _cssTransform["default"]();
var calc = new _cssCalc["default"]();
var media = new _cssMedia["default"]();

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

// Event listeners for cache invalidation
try {
  var _Dimensions$addEventL, _Appearance$addChange;
  Dimensions === null || Dimensions === void 0 || (_Dimensions$addEventL = Dimensions.addEventListener) === null || _Dimensions$addEventL === void 0 || _Dimensions$addEventL.call(Dimensions, "change", invalidateCache);
  Appearance === null || Appearance === void 0 || (_Appearance$addChange = Appearance.addChangeListener) === null || _Appearance$addChange === void 0 || _Appearance$addChange.call(Appearance, invalidateCache);
} catch (_unused4) {
  // Ignore in environments where listeners are not supported
}

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
// Main Transform Function
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

  // Check cache validity
  var cacheKey = getCacheKey();
  if (cacheKey !== currentCacheKey) {
    TRANSFORM_CACHE = {};
    currentCacheKey = cacheKey;
  }
  var transformedDeclarations = classNames.split(" ").map(function (className) {
    var _declaration, _declaration2, _declaration3;
    if (!className) return null;

    // Check cache
    if (TRANSFORM_CACHE[className] !== undefined) {
      return TRANSFORM_CACHE[className];
    }
    var declaration = stylesheet[className];
    if (!declaration) {
      if (className.startsWith("active:") || className.startsWith("pressed:") || className.startsWith("disabled:") || className.startsWith("group-active:") || className.startsWith("group-pressed:")) {
        var base = className.replace(/^(active|pressed|disabled):/, "").replace(/^group-(active|pressed):/, "");
        declaration = stylesheet[base] || stylesheet[className] || stylesheet["disabled:".concat(base)] || stylesheet["active:".concat(base)] || stylesheet["group-active:".concat(base)];
      } else {
        declaration = stylesheet["active:".concat(className)] || stylesheet["pressed:".concat(className)] || stylesheet["disabled:".concat(className)] || stylesheet["group-active:".concat(className)];
      }
    }
    var globalDeclaration = stylesheet[":root"];
    if (!declaration && !globalDeclaration) {
      TRANSFORM_CACHE[className] = null;
      return null;
    }

    // Reset vars helper
    vars.global = {};
    vars.data = {};
    if (globalDeclaration) {
      // Handle global with potential _static/_dynamic format
      var globalRaw = globalDeclaration._static ? _objectSpread(_objectSpread({}, globalDeclaration._static), globalDeclaration._dynamic) : globalDeclaration;
      vars.setGlobal(globalRaw, {
        width: width,
        height: height
      });
    }
    if (declaration) {
      // Handle declaration with potential _static/_dynamic format
      var declRaw = declaration._static ? _objectSpread(_objectSpread({}, declaration._static), declaration._dynamic) : declaration;
      vars.set(className, declRaw, {
        width: width,
        height: height
      });
    }

    // Get static and dynamic parts
    var staticPart = ((_declaration = declaration) === null || _declaration === void 0 ? void 0 : _declaration._static) || {};
    var dynamicPart = ((_declaration2 = declaration) === null || _declaration2 === void 0 ? void 0 : _declaration2._dynamic) || ((_declaration3 = declaration) !== null && _declaration3 !== void 0 && _declaration3._static ? {} : declaration) || {};

    // Start with pre-computed static styles (excluding CSS variables starting with --)
    var results = {};
    for (var key in staticPart) {
      if (!vars.isVar(key)) {
        results[key] = staticPart[key];
      }
    }

    // Process dynamic properties
    var _transformDynamic = function transformDynamic(currentSelector, decl) {
      for (var property in decl) {
        if (vars.isVar(property)) continue;
        var value = decl[property];

        // Handle media queries
        var _media$match = media.match(property, {
            width: width,
            height: height,
            colorScheme: colorScheme
          }),
          _media$match2 = _slicedToArray(_media$match, 2),
          isMedia = _media$match2[0],
          matchedMedia = _media$match2[1];
        if (isMedia) {
          if (matchedMedia) {
            var _value, _value2, _value3;
            vars.set(property, value);
            // Media query value might have _static/_dynamic too
            var mediaStatic = ((_value = value) === null || _value === void 0 ? void 0 : _value._static) || {};
            var mediaDynamic = ((_value2 = value) === null || _value2 === void 0 ? void 0 : _value2._dynamic) || ((_value3 = value) !== null && _value3 !== void 0 && _value3._static ? {} : value) || {};
            for (var _key in mediaStatic) {
              if (!vars.isVar(_key)) {
                results[_key] = mediaStatic[_key];
              }
            }
            _transformDynamic(property, mediaDynamic);
          }
          continue;
        }

        // Transform the value
        var _transform$transformU = transform.transformUnsafeValue(property, value);
        var _transform$transformU2 = _slicedToArray(_transform$transformU, 2);
        property = _transform$transformU2[0];
        value = _transform$transformU2[1];
        if (!property) continue;
        value = vars.injectVar(currentSelector, value);
        value = transform.transformUnsupportedUnit(value);
        value = transform.transformViewportUnit(value, {
          width: width,
          height: height
        });
        value = transform.removeUnit(value);
        value = calc.calc(value);
        value = calc.calcColor(value);
        value = transform.transformFontScaling(property, value, {
          width: width,
          height: height,
          roundFn: PixelRatio.roundToNearestPixel
        });
        if (value === undefined) continue;
        var transformed = transform.transform(property, value, {
          width: width,
          height: height
        });
        if (transformed) {
          for (var _key2 in transformed) {
            if (!vars.isVar(_key2)) {
              results[_key2] = transformed[_key2];
            }
          }
        }
      }
    };
    _transformDynamic(className, dynamicPart);
    TRANSFORM_CACHE[className] = results;
    return results;
  });
  return getFlattenStyle(transformedDeclarations);
}

// ============================================================================
// Inherit Style
// ============================================================================
function getInheritStyle(declarations) {
  if (!declarations) return undefined;
  var inheritDeclarations = {};
  var _iterator = _createForOfIteratorHelper(INHERIT_PROPERTIES),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var key = _step.value;
      if (declarations[key] !== undefined) {
        inheritDeclarations[key] = declarations[key];
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return Object.keys(inheritDeclarations).length > 0 ? inheritDeclarations : undefined;
}

// ============================================================================
// Main Entry Point
// ============================================================================
function getStyle(stylesheet, _ref) {
  var _ref2 = _slicedToArray(_ref, 4),
    inheritStyle = _ref2[0],
    className = _ref2[1],
    style = _ref2[2],
    elementName = _ref2[3];
  var inherited = getInheritStyle(getFlattenStyle(inheritStyle));
  var transformed = transformStyles(stylesheet, className);
  var result = getFlattenStyle([inherited, transformed, style]);
  return result;
}

// ============================================================================
// Lightweight Merge for Static Styles
// ============================================================================

/**
 * Lightweight merge function for static styles with inheritStyle
 * Much cheaper than full getStyle() - just extracts inherited props and merges
 */
function mergeStyles(inheritStyle, staticStyles, inlineStyle) {
  // Fast path: no inheritStyle
  if (!inheritStyle && !inlineStyle) {
    return staticStyles;
  }

  // Extract inherited properties from inheritStyle
  var inherited;
  if (inheritStyle) {
    var flatInherit = getFlattenStyle(inheritStyle);
    if (flatInherit) {
      inherited = {};
      var _iterator2 = _createForOfIteratorHelper(INHERIT_PROPERTIES),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var key = _step2.value;
          if (flatInherit[key] !== undefined) {
            inherited[key] = flatInherit[key];
          }
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
      if (Object.keys(inherited).length === 0) {
        inherited = undefined;
      }
    }
  }

  // Merge: inheritStyle (lowest) -> staticStyles -> inlineStyle (highest)
  if (!inherited && !inlineStyle) {
    return staticStyles;
  }
  var result = {};
  if (inherited) Object.assign(result, inherited);
  if (staticStyles) {
    for (var _key3 in staticStyles) {
      if (!vars.isVar(_key3)) {
        result[_key3] = staticStyles[_key3];
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