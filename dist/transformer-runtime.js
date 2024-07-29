"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _reactNative = require("react-native");
var _cssCalc = _interopRequireDefault(require("./features/css-calc"));
var _cssMedia = _interopRequireDefault(require("./features/css-media"));
var _cssTransform = _interopRequireDefault(require("./features/css-transform"));
var _cssVars = _interopRequireDefault(require("./features/css-vars"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i["return"] && (_r = _i["return"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
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
  }, []);
  return flattenDeclarations.reduce(function (acc, obj) {
    return Object.assign(acc, obj);
  }, {});
}
function transform(stylesheet, classNames) {
  if (!stylesheet || !classNames) return;
  var transformedDeclarations = classNames.split(" ").map(function (className) {
    var declaration = stylesheet[className];
    var globalDeclaration = stylesheet[":root"];
    if (!declaration && !globalDeclaration) return null;
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
    var transformStylesheet = function transformStylesheet(currentSelector, declaration) {
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
            transformed = transformStylesheet(property, value);
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
        if (value === undefined) continue;
        transformed = transform.transform(property, value);
        if (transformed) {
          results = _objectSpread(_objectSpread({}, results), transformed);
        }
      }
      return results;
    };
    return transformStylesheet(className, declaration);
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
var _default = {
  getStyle: getStyle
};
exports["default"] = _default;