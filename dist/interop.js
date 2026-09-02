"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.InheritContext = exports.GroupContext = void 0;
exports.cssInterop = cssInterop;
exports["default"] = void 0;
exports.getGlobalStylesheet = getGlobalStylesheet;
exports.remapProps = remapProps;
exports.setGlobalStylesheet = setGlobalStylesheet;
var _react = _interopRequireWildcard(require("react"));
var _transformerRuntime = _interopRequireDefault(require("./transformer-runtime.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function _interopRequireWildcard(e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, "default": e }; if (null === e || "object" != _typeof(e) && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (var _t in e) "default" !== _t && {}.hasOwnProperty.call(e, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e[_t]); return f; })(e, t); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
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
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
var InheritContext = exports.InheritContext = (0, _react.createContext)(undefined);
var GroupContext = exports.GroupContext = (0, _react.createContext)({
  pressed: false,
  hovered: false,
  focus: false
});
var globalStylesheet = {};
try {
  var raw = require("./exported-stylesheet.json");
  var current = raw;
  while ((_current = current) !== null && _current !== void 0 && _current["default"] && _typeof(current["default"]) === "object" && !current[":root"]) {
    var _current;
    current = current["default"];
  }
  globalStylesheet = current || {};
} catch (_unused) {
  // Fallback to empty if not yet compiled
}
function setGlobalStylesheet(sheet) {
  if (sheet && _typeof(sheet) === "object") {
    var _Runtime$clearCache;
    var _current2 = sheet;
    while ((_current3 = _current2) !== null && _current3 !== void 0 && _current3["default"] && _typeof(_current2["default"]) === "object" && !_current2[":root"]) {
      var _current3;
      _current2 = _current2["default"];
    }
    globalStylesheet = _current2;
    (_Runtime$clearCache = _transformerRuntime["default"].clearCache) === null || _Runtime$clearCache === void 0 || _Runtime$clearCache.call(_transformerRuntime["default"]);
  }
}
function getGlobalStylesheet() {
  return globalStylesheet;
}

/**
 * cssInterop(Component, mapping)
 *
 * Wraps any React Native or third-party component to support className mapping.
 *
 * @example
 * cssInterop(FlashList, {
 *   className: "style",
 *   contentContainerClassName: "contentContainerStyle",
 * });
 *
 * @param {React.ComponentType} Component
 * @param {Record<string, string>} mapping Mapping of class props to style props
 * @returns {React.ForwardRefExoticComponent}
 */
function cssInterop(Component) {
  var mapping = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
    className: "style"
  };
  var InteropComponent = (0, _react.forwardRef)(function (props, ref) {
    var parentInherit = (0, _react.useContext)(InheritContext);
    var parentGroup = (0, _react.useContext)(GroupContext);
    var inheritStyle = props.inheritStyle || parentInherit;
    var _React$useState = _react["default"].useState(false),
      _React$useState2 = _slicedToArray(_React$useState, 2),
      groupPressed = _React$useState2[0],
      setGroupPressed = _React$useState2[1];
    var nextProps = _objectSpread({}, props);
    if (ref) {
      nextProps.ref = ref;
    }
    var sheet = getGlobalStylesheet();
    var currentInherit = parentInherit;
    var isGroupProvider = false;

    // Check if this component acts as a group container
    for (var _i = 0, _Object$keys = Object.keys(mapping); _i < _Object$keys.length; _i++) {
      var classProp = _Object$keys[_i];
      var val = props[classProp];
      if (typeof val === "string" && (val === "group" || val.split(/\s+/).includes("group"))) {
        isGroupProvider = true;
        break;
      }
    }
    if (isGroupProvider) {
      var originalOnPressIn = props.onPressIn;
      var originalOnPressOut = props.onPressOut;
      nextProps.onPressIn = function (e) {
        setGroupPressed(true);
        originalOnPressIn === null || originalOnPressIn === void 0 || originalOnPressIn(e);
      };
      nextProps.onPressOut = function (e) {
        setGroupPressed(false);
        originalOnPressOut === null || originalOnPressOut === void 0 || originalOnPressOut(e);
      };
    }
    var _loop = function _loop() {
      var _Object$entries$_i = _slicedToArray(_Object$entries[_i2], 2),
        classProp = _Object$entries$_i[0],
        styleProp = _Object$entries$_i[1];
      var classValue = props[classProp];
      var hasClass = typeof classValue === "string" && classValue.length > 0;
      var isPrimaryStyle = styleProp === "style";
      var hasInherit = isPrimaryStyle && Boolean(inheritStyle);
      if (hasClass) {
        var _props$accessibilityS;
        var hasActiveVariants = /(^|\s)(active|pressed):/.test(classValue);
        var hasDisabledVariants = /(^|\s)disabled:/.test(classValue);
        var hasGroupActiveVariants = /(^|\s)group-(active|pressed):/.test(classValue);
        var isDisabled = Boolean(props.disabled || ((_props$accessibilityS = props.accessibilityState) === null || _props$accessibilityS === void 0 ? void 0 : _props$accessibilityS.disabled));
        if ((hasActiveVariants || hasDisabledVariants || hasGroupActiveVariants) && isPrimaryStyle) {
          var classes = classValue.trim().split(/\s+/);
          var normalClasses = [];
          var activeClasses = [];
          var disabledClasses = [];
          var groupActiveClasses = [];
          var _iterator = _createForOfIteratorHelper(classes),
            _step;
          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              var cls = _step.value;
              if (cls.startsWith("active:") || cls.startsWith("pressed:")) {
                var baseCls = cls.replace(/^(active|pressed):/, "");
                activeClasses.push(baseCls);
              } else if (cls.startsWith("disabled:")) {
                var _baseCls = cls.replace(/^disabled:/, "");
                disabledClasses.push(_baseCls);
              } else if (cls.startsWith("group-active:") || cls.startsWith("group-pressed:")) {
                var _baseCls2 = cls.replace(/^group-(active|pressed):/, "");
                groupActiveClasses.push(_baseCls2);
              } else {
                normalClasses.push(cls);
              }
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }
          var normalStyle = _transformerRuntime["default"].getStyle(sheet, [hasInherit ? inheritStyle : undefined, normalClasses.join(" "), _typeof(props[styleProp]) === "object" ? props[styleProp] : undefined]);
          var activeStyle = activeClasses.length > 0 ? _transformerRuntime["default"].getStyle(sheet, [undefined, activeClasses.join(" "), undefined]) : undefined;
          var disabledStyle = disabledClasses.length > 0 ? _transformerRuntime["default"].getStyle(sheet, [undefined, disabledClasses.join(" "), undefined]) : undefined;
          var groupActiveStyle = hasGroupActiveVariants && parentGroup.pressed && groupActiveClasses.length > 0 ? _transformerRuntime["default"].getStyle(sheet, [undefined, groupActiveClasses.join(" "), undefined]) : undefined;
          if (hasActiveVariants || typeof props[styleProp] === "function") {
            nextProps[styleProp] = function (state) {
              var isPressed = state && state.pressed || false;
              var userStyle = typeof props[styleProp] === "function" ? props[styleProp](state) : null;
              var currentStyles = [normalStyle, groupActiveStyle];
              if (isPressed && !isDisabled && activeStyle) {
                currentStyles.push(activeStyle);
              }
              if (isDisabled && disabledStyle) {
                currentStyles.push(disabledStyle);
              }
              if (userStyle) {
                currentStyles.push(userStyle);
              }
              return currentStyles.filter(Boolean);
            };
          } else {
            var currentStyles = [normalStyle, groupActiveStyle, isDisabled ? disabledStyle : undefined, _typeof(props[styleProp]) === "object" ? props[styleProp] : undefined].filter(Boolean);
            nextProps[styleProp] = currentStyles.length === 1 ? currentStyles[0] : currentStyles.length > 1 ? currentStyles : undefined;
          }
          var inheritable = _transformerRuntime["default"].getInheritStyle(normalStyle);
          if (inheritable) {
            currentInherit = parentInherit ? _objectSpread(_objectSpread({}, parentInherit), inheritable) : inheritable;
          }
        } else {
          // Dynamic className present - runtime resolution
          var computedStyle = _transformerRuntime["default"].getStyle(sheet, [hasInherit ? inheritStyle : undefined, classValue, props[styleProp]]);
          if (computedStyle !== undefined) {
            nextProps[styleProp] = computedStyle;
            if (isPrimaryStyle) {
              var _inheritable = _transformerRuntime["default"].getInheritStyle(computedStyle);
              if (_inheritable) {
                currentInherit = parentInherit ? _objectSpread(_objectSpread({}, parentInherit), _inheritable) : _inheritable;
              }
            }
          }
        }
        delete nextProps[classProp];
      } else if (isPrimaryStyle) {
        // Static inlined style or plain style prop with inheritance
        var ownStyle = props[styleProp];
        if (typeof ownStyle === "function") {
          if (hasInherit) {
            nextProps[styleProp] = function (state) {
              var res = ownStyle(state);
              return [inheritStyle, res];
            };
          } else {
            nextProps[styleProp] = ownStyle;
          }
        } else {
          var flatOwnStyle = ownStyle ? _transformerRuntime["default"].getFlattenStyle(ownStyle) : undefined;
          if (hasInherit) {
            var merged = _transformerRuntime["default"].mergeStyles(inheritStyle, flatOwnStyle, undefined);
            if (merged !== undefined) {
              nextProps[styleProp] = merged;
            }
          }

          // Inheritable styles come from either the component's own style or inherited from parent
          var combinedForInherit = hasInherit ? _transformerRuntime["default"].mergeStyles(inheritStyle, flatOwnStyle, undefined) : flatOwnStyle;
          var ownInheritable = _transformerRuntime["default"].getInheritStyle(combinedForInherit);
          if (ownInheritable) {
            currentInherit = parentInherit ? _objectSpread(_objectSpread({}, parentInherit), ownInheritable) : ownInheritable;
          }
        }
      }
    };
    for (var _i2 = 0, _Object$entries = Object.entries(mapping); _i2 < _Object$entries.length; _i2++) {
      _loop();
    }
    delete nextProps.inheritStyle;
    var element = _react["default"].createElement(Component, nextProps);
    if (isGroupProvider) {
      element = _react["default"].createElement(GroupContext.Provider, {
        value: _objectSpread(_objectSpread({}, parentGroup), {}, {
          pressed: groupPressed
        })
      }, element);
    }
    if (currentInherit && currentInherit !== parentInherit) {
      return _react["default"].createElement(InheritContext.Provider, {
        value: currentInherit
      }, element);
    }
    return element;
  });
  var name = Component.displayName || Component.name || "Component";
  InteropComponent.displayName = "CssInterop(".concat(name, ")");
  return InteropComponent;
}
function remapProps(Component, mapping) {
  return cssInterop(Component, mapping);
}
var _default = exports["default"] = cssInterop;