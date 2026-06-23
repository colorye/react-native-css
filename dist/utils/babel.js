"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.areAllClassesStatic = areAllClassesStatic;
exports.computeStaticStyles = computeStaticStyles;
exports.getInheritStyleExpression = getInheritStyleExpression;
exports.getRootInheritStyleExpression = getRootInheritStyleExpression;
exports.getStaticClassNameValue = getStaticClassNameValue;
exports.getStaticMergeExpression = getStaticMergeExpression;
exports.getStaticStylesFromClass = getStaticStylesFromClass;
exports.getStyleExpression = getStyleExpression;
exports.isClassStatic = isClassStatic;
exports.isFragmentElement = isFragmentElement;
exports.isImportOrRequire = isImportOrRequire;
exports.isRootLevelJSXElement = isRootLevelJSXElement;
exports.isStaticClassName = isStaticClassName;
exports.objectToAST = objectToAST;
exports.tryGetStaticStyleInfo = tryGetStaticStyleInfo;
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
function isImportOrRequire(statement) {
  var _statement$node;
  return statement.isImportDeclaration() || ((_statement$node = statement.node) === null || _statement$node === void 0 || (_statement$node = _statement$node.declarations) === null || _statement$node === void 0 || (_statement$node = _statement$node[0]) === null || _statement$node === void 0 || (_statement$node = _statement$node.init) === null || _statement$node === void 0 || (_statement$node = _statement$node.callee) === null || _statement$node === void 0 ? void 0 : _statement$node.name) === "require";
}
function isFragmentElement(t, elementName) {
  return t.isJSXIdentifier(elementName) && (elementName.name === "Fragment" || elementName.name === "React.Fragment") || t.isJSXMemberExpression(elementName) && elementName.object.name === "React" && elementName.property.name === "Fragment" || t.isJSXIdentifier(elementName, {
    name: ""
  }) // JSX shorthand fragment
;
}
function isRootLevelJSXElement(path) {
  var currentPath = path;
  while (currentPath.parentPath) {
    var parent = currentPath.parentPath;
    if (parent.isReturnStatement()) return true;
    if (parent.isArrowFunctionExpression() && parent.node.body === currentPath.node) return true;
    if (parent.isJSXElement() && parent !== path) return false;
    if (parent.isConditionalExpression() || parent.isLogicalExpression() || parent.isParenthesizedExpression()) {
      currentPath = parent;
      continue;
    }
    currentPath = parent;
  }
  return false;
}

// ============================================================================
// Static style detection helpers
// ============================================================================

/**
 * Check if className is a static string literal
 */
function isStaticClassName(t, classNameAttr) {
  if (!classNameAttr) return false;
  if (t.isStringLiteral(classNameAttr.value)) return true;
  if (t.isJSXExpressionContainer(classNameAttr.value) && t.isStringLiteral(classNameAttr.value.expression)) {
    return true;
  }
  return false;
}

/**
 * Get static className string value
 */
function getStaticClassNameValue(t, classNameAttr) {
  if (!classNameAttr) return null;
  if (t.isStringLiteral(classNameAttr.value)) return classNameAttr.value.value;
  if (t.isJSXExpressionContainer(classNameAttr.value) && t.isStringLiteral(classNameAttr.value.expression)) {
    return classNameAttr.value.expression.value;
  }
  return null;
}

/**
 * Check if a class is fully static (no _dynamic property)
 */
function isClassStatic(stylesheet, className) {
  var decl = stylesheet[className];
  if (!decl) return true; // Non-existent class is "static" (no-op)
  if (decl._dynamic && Object.keys(decl._dynamic).length > 0) return false;
  if (decl._static) return true; // Has _static wrapper
  // Check if it's a plain object (fully static, no wrapper)
  return _typeof(decl) === "object" && !decl._dynamic;
}

/**
 * Get static styles from a class declaration
 */
function getStaticStylesFromClass(stylesheet, className) {
  var decl = stylesheet[className];
  if (!decl) return {};

  // If has _static wrapper, use that
  if (decl._static) return _objectSpread({}, decl._static);

  // If plain object (fully static), use directly
  if (_typeof(decl) === "object" && !decl._dynamic) {
    // Filter out any metadata keys
    var result = {};
    for (var _i = 0, _Object$entries = Object.entries(decl); _i < _Object$entries.length; _i++) {
      var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
        key = _Object$entries$_i[0],
        value = _Object$entries$_i[1];
      if (!key.startsWith("_") && !key.startsWith("@media")) {
        result[key] = value;
      }
    }
    return result;
  }
  return {};
}

/**
 * Check if all classes in className string are static
 */
function areAllClassesStatic(stylesheet, classNameValue) {
  if (!classNameValue || !stylesheet) return false;
  var classes = classNameValue.trim().split(/\s+/).filter(Boolean);
  return classes.every(function (cls) {
    return isClassStatic(stylesheet, cls);
  });
}

/**
 * Compute merged static styles from className string
 */
function computeStaticStyles(stylesheet, classNameValue) {
  if (!classNameValue || !stylesheet) return {};
  var classes = classNameValue.trim().split(/\s+/).filter(Boolean);
  var result = {};
  var _iterator = _createForOfIteratorHelper(classes),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var cls = _step.value;
      var styles = getStaticStylesFromClass(stylesheet, cls);
      result = _objectSpread(_objectSpread({}, result), styles);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return result;
}

/**
 * Convert JavaScript object to Babel AST
 */
function objectToAST(t, obj) {
  if (obj === null || obj === undefined) return t.nullLiteral();
  if (Array.isArray(obj)) {
    return t.arrayExpression(obj.map(function (item) {
      return objectToAST(t, item);
    }));
  }
  if (_typeof(obj) === "object") {
    return t.objectExpression(Object.entries(obj).map(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
        key = _ref2[0],
        value = _ref2[1];
      return t.objectProperty(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? t.identifier(key) : t.stringLiteral(key), objectToAST(t, value));
    }));
  }
  if (typeof obj === "string") return t.stringLiteral(obj);
  if (typeof obj === "number") return t.numericLiteral(obj);
  if (typeof obj === "boolean") return t.booleanLiteral(obj);
  return t.nullLiteral();
}

/**
 * Try to get static style info for an element
 * Returns { staticStyles, hasInheritStyle, inlineStyleExpr } or null if not static
 */
function tryGetStaticStyleInfo(path, state, t) {
  var openingElement = path.node.openingElement;
  var classNameAttr = openingElement.attributes.find(function (attr) {
    var _attr$name;
    return t.isJSXAttribute(attr) && ((_attr$name = attr.name) === null || _attr$name === void 0 ? void 0 : _attr$name.name) === "className";
  });

  // Check if className is static
  if (!isStaticClassName(t, classNameAttr)) return null;

  // Get stylesheet
  var stylesheet = state.stylesheetData;
  if (!stylesheet) return null;
  var classNameValue = getStaticClassNameValue(t, classNameAttr);
  if (!classNameValue) return null;

  // Check if all classes are fully static
  if (!areAllClassesStatic(stylesheet, classNameValue)) return null;

  // Compute static styles from className
  var staticStyles = computeStaticStyles(stylesheet, classNameValue);

  // Get inheritStyle attribute (for mergeStyles call)
  var inheritStyleAttr = openingElement.attributes.find(function (attr) {
    var _attr$name2;
    return t.isJSXAttribute(attr) && ((_attr$name2 = attr.name) === null || _attr$name2 === void 0 ? void 0 : _attr$name2.name) === "inheritStyle";
  });

  // Get style attribute
  var styleAttr = openingElement.attributes.find(function (attr) {
    var _attr$name3;
    return t.isJSXAttribute(attr) && ((_attr$name3 = attr.name) === null || _attr$name3 === void 0 ? void 0 : _attr$name3.name) === "style";
  });
  return {
    staticStyles: staticStyles,
    inheritStyleAttr: inheritStyleAttr,
    styleAttr: styleAttr
  };
}

/**
 * Generate mergeStyles(inheritStyle, staticStyles, inlineStyle) expression
 */
function getStaticMergeExpression(path, state, t, staticInfo) {
  var _inheritStyleAttr$val, _styleAttr$value;
  var staticStyles = staticInfo.staticStyles,
    inheritStyleAttr = staticInfo.inheritStyleAttr,
    styleAttr = staticInfo.styleAttr;

  // Get inheritStyle expression
  var propInheritStyle = getMemoizedInheritStyleExpression(path, t);
  var inheritStyleExpr = inheritStyleAttr === null || inheritStyleAttr === void 0 || (_inheritStyleAttr$val = inheritStyleAttr.value) === null || _inheritStyleAttr$val === void 0 ? void 0 : _inheritStyleAttr$val.expression;

  // Build inheritStyle array: [props.inheritStyle, explicitInheritStyle]
  var inheritArg;
  if (propInheritStyle || inheritStyleExpr) {
    inheritArg = t.arrayExpression([propInheritStyle || t.nullLiteral(), inheritStyleExpr || t.nullLiteral()]);
  } else {
    inheritArg = t.nullLiteral();
  }

  // Static styles as inline object
  var staticArg = Object.keys(staticStyles).length > 0 ? objectToAST(t, staticStyles) : t.nullLiteral();

  // Inline style expression
  var inlineArg = (styleAttr === null || styleAttr === void 0 || (_styleAttr$value = styleAttr.value) === null || _styleAttr$value === void 0 ? void 0 : _styleAttr$value.expression) || t.nullLiteral();

  // mergeStyles(inheritStyle, staticStyles, inlineStyle)
  return t.callExpression(state.mergeStylesId, [inheritArg, staticArg, inlineArg]);
}

// ============================================================================
// InheritStyle helpers
// ============================================================================

var inheritStyleMemo = new WeakMap();
function getMemoizedInheritStyleExpression(path, t) {
  var currentPath = path;
  var funcPath = null;
  while (currentPath && !funcPath) {
    if (currentPath.isFunction()) {
      funcPath = currentPath;
      break;
    }
    currentPath = currentPath.parentPath;
  }
  if (!funcPath) return undefined;
  if (inheritStyleMemo.has(funcPath.node)) {
    return inheritStyleMemo.get(funcPath.node);
  }
  var result;
  var params = funcPath.node.params;
  var parentPath = funcPath.parentPath;
  if (parentPath && parentPath.isCallExpression() && parentPath.node.callee && parentPath.node.callee.type === "Identifier" && ["useMemo", "useCallback"].includes(parentPath.node.callee.name)) {
    result = undefined;
  } else if (params.length === 0) {
    funcPath.node.params = [t.identifier("props")];
    result = t.memberExpression(t.identifier("props"), t.identifier("inheritStyle"), false, false);
  } else if (params.length > 0) {
    var firstParam = params[0];
    if (t.isIdentifier(firstParam)) {
      result = t.memberExpression(firstParam, t.identifier("inheritStyle"), false, false);
    } else if (t.isObjectPattern(firstParam)) {
      var restElement = firstParam.properties.find(function (p) {
        return t.isRestElement(p);
      });
      if (restElement) {
        result = t.memberExpression(restElement.argument, t.identifier("inheritStyle"), false, false);
      } else {
        var restProp = t.restElement(t.identifier("rest"));
        firstParam.properties.push(restProp);
        result = t.memberExpression(t.identifier("rest"), t.identifier("inheritStyle"), false, false);
      }
    }
  }
  inheritStyleMemo.set(funcPath.node, result);
  return result;
}

// ============================================================================
// Style expression generators (for dynamic/fallback cases)
// ============================================================================

function getStyleExpression(path, state, t) {
  var openingElement = path.node.openingElement;
  var elementName = openingElement.name;
  var propInheritStyle = getMemoizedInheritStyleExpression(path, t);
  var inheritStyle = openingElement.attributes.find(function (attr) {
    var _attr$name4;
    return ((_attr$name4 = attr.name) === null || _attr$name4 === void 0 ? void 0 : _attr$name4.name) === "inheritStyle";
  });
  var className = openingElement.attributes.find(function (attr) {
    var _attr$name5;
    return ((_attr$name5 = attr.name) === null || _attr$name5 === void 0 ? void 0 : _attr$name5.name) === "className";
  });
  var style = openingElement.attributes.find(function (attr) {
    var _attr$name6;
    return ((_attr$name6 = attr.name) === null || _attr$name6 === void 0 ? void 0 : _attr$name6.name) === "style";
  });
  return t.callExpression(state.getStyleId, [state.stylesheetId, t.arrayExpression([t.arrayExpression([propInheritStyle || t.nullLiteral(), inheritStyle && inheritStyle.value.expression || t.nullLiteral()]), className && (t.isStringLiteral(className.value) ? t.stringLiteral(className.value.value) : className.value.expression) || t.nullLiteral(), style && style.value.expression || t.nullLiteral(), t.isJSXIdentifier(elementName) ? t.stringLiteral(elementName.name) : t.isJSXMemberExpression(elementName) ? t.stringLiteral("".concat(elementName.object.name, ".").concat(elementName.property.name)) : t.stringLiteral("Unknown")])]);
}
function getInheritStyleExpression(path, state, t) {
  return t.callExpression(state.getInheritStyleId, [getStyleExpression(path, state, t)]);
}
function getRootInheritStyleExpression(path, t) {
  var propInheritStyle = getMemoizedInheritStyleExpression(path, t);
  return propInheritStyle || t.identifier("undefined");
}