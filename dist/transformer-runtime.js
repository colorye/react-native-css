"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _reactNative = require("react-native");
var _cssCalc = _interopRequireDefault(require("./features/css-calc"));
var _cssMedia = _interopRequireDefault(require("./features/css-media"));
var _cssTransform = _interopRequireDefault(require("./features/css-transform"));
var _cssVars = _interopRequireDefault(require("./features/css-vars"));
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
var TRANSFORM_CACHED = {};
var INHERIT_PROPERTIES = ["color", "fontFamily", "fontSize", "fontStyle", "fontWeight", "fontVariant", "letterSpacing", "lineHeight", "textAlign", "textTransform"];
function getFlattenStyle(declarations) {
  if (!Array.isArray(declarations)) {
    return declarations;
  }
  var flattenDeclarations = declarations.reduce(function (acc, item) {
    if (!item) return acc;
    if (Array.isArray(item)) {
      return acc.concat(getFlattenStyle(item));
    } else {
      return acc.concat(item);
    }
  }, []).filter(Boolean);
  if (flattenDeclarations.length === 0) return undefined;
  return flattenDeclarations.reduce(function (acc, obj) {
    return Object.assign(acc, obj);
  }, {});
}
function transform(stylesheet, classNames) {
  if (!stylesheet || !classNames) return;
  var transformedDeclarations = classNames.split(" ").map(function (className) {
    if (process.env.NODE_ENV === "production" || process.env.EXPO_PUBLIC_ENABLED_CSS_TRANSFORM_CACHED) {
      if (TRANSFORM_CACHED[className]) {
        return TRANSFORM_CACHED[className];
      }
    }
    var declaration = stylesheet[className];
    var globalDeclaration = stylesheet[":root"];
    if (!declaration && !globalDeclaration) {
      TRANSFORM_CACHED[className] = null;
      return null;
    }
    var _Dimensions$get = _reactNative.Dimensions.get("window"),
      width = _Dimensions$get.width,
      height = _Dimensions$get.height;
    var colorScheme = _reactNative.Appearance.getColorScheme();
    var vars = new _cssVars["default"]();
    var transform = new _cssTransform["default"]();
    var calc = new _cssCalc["default"]();
    var media = new _cssMedia["default"]();
    if (globalDeclaration) {
      vars.setGlobal(globalDeclaration, {
        width: width,
        height: height
      });
    }
    if (declaration) {
      vars.set(className, declaration, {
        width: width,
        height: height
      });
    }
    var _transformStylesheet = function transformStylesheet(currentSelector, declaration) {
      var results = {};
      for (var property in declaration) {
        if (vars.isVar(property)) continue;
        var value = declaration[property];
        var transformed = void 0;
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
            vars.set(property, value);
            transformed = _transformStylesheet(property, value);
            if (transformed) {
              results = _objectSpread(_objectSpread({}, results), transformed);
            }
          }
          continue;
        }
        var _transform$transformU = transform.transformUnsafeValue(property, value);
        var _transform$transformU2 = _slicedToArray(_transform$transformU, 2);
        property = _transform$transformU2[0];
        value = _transform$transformU2[1];
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
          roundFn: _reactNative.PixelRatio.roundToNearestPixel
        });
        if (value === undefined) continue;
        transformed = transform.transform(property, value, {
          width: width,
          height: height
        });
        if (transformed) {
          results = _objectSpread(_objectSpread({}, results), transformed);
        }
      }
      return results;
    };
    var transformedDeclaration = _transformStylesheet(className, declaration);
    TRANSFORM_CACHED[className] = transformedDeclaration;
    return transformedDeclaration;
  });
  return getFlattenStyle(transformedDeclarations);
}
function getInheritStyle(declarations) {
  if (!declarations) return;
  var inheritDeclarations = Object.entries(declarations).reduce(function (res, _ref) {
    var _ref2 = _slicedToArray(_ref, 2),
      key = _ref2[0],
      value = _ref2[1];
    if (INHERIT_PROPERTIES.includes(key)) {
      res[key] = value;
    }
    return res;
  }, {});
  return inheritDeclarations;
}
function getStyle(stylesheet, _ref3) {
  var _ref4 = _slicedToArray(_ref3, 3),
    inheritStyle = _ref4[0],
    className = _ref4[1],
    style = _ref4[2];
  return getFlattenStyle([getInheritStyle(getFlattenStyle(inheritStyle)), transform(stylesheet, className), style]);
}
var _default = exports["default"] = {
  getStyle: getStyle,
  getInheritStyle: getInheritStyle
};