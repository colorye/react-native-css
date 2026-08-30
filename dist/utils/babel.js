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
exports.getStyleExpression = getStyleExpression;
exports.inlineStaticAttributes = inlineStaticAttributes;
exports.isClassStatic = isClassStatic;
exports.isFragmentElement = isFragmentElement;
exports.isImportOrRequire = isImportOrRequire;
exports.isRootLevelJSXElement = isRootLevelJSXElement;
exports.isStaticClassName = isStaticClassName;
exports.objectToAST = objectToAST;
exports.tryGetStaticStyleInfo = tryGetStaticStyleInfo;
var _transformerRuntime = _interopRequireDefault(require("../transformer-runtime.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
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
 * Check if a class is fully static (no dynamic breakpoint / dark mode queries)
 */
function isClassStatic(stylesheet, className) {
  if (!className) return true;
  if (className === "group" || className.startsWith("group") || className.startsWith("peer") || className.startsWith("active:") || className.startsWith("pressed:") || className.startsWith("disabled:") || className.startsWith("dark:") || className.startsWith("light:") || className.startsWith("sm:") || className.startsWith("md:") || className.startsWith("lg:") || className.startsWith("xl:") || className.startsWith("2xl:") || className.startsWith("portrait:") || className.startsWith("landscape:")) {
    return false;
  }
  return true;
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
 * Compute merged static styles from className string using Runtime compiler
 */
function computeStaticStyles(stylesheet, classNameValue) {
  if (!classNameValue || !stylesheet) return {};
  try {
    var computed = _transformerRuntime["default"].getStyle(stylesheet, [undefined, classNameValue, undefined]);
    return computed || {};
  } catch (_unused) {
    return {};
  }
}

/**
 * Inlines static className and contentContainerClassName attributes directly into styles
 */
function inlineStaticAttributes(path, state, t) {
  if (!state.stylesheetData) return;
  var openingElement = path.node.openingElement;
  var stylesheet = state.stylesheetData;
  var classPropMappings = [{
    classProp: "className",
    styleProp: "style"
  }, {
    classProp: "contentContainerClassName",
    styleProp: "contentContainerStyle"
  }];
  var _loop = function _loop() {
      var _classPropMappings$_i = _classPropMappings[_i],
        classProp = _classPropMappings$_i.classProp,
        styleProp = _classPropMappings$_i.styleProp;
      var classAttrIndex = openingElement.attributes.findIndex(function (attr) {
        var _attr$name;
        return t.isJSXAttribute(attr) && ((_attr$name = attr.name) === null || _attr$name === void 0 ? void 0 : _attr$name.name) === classProp;
      });
      if (classAttrIndex === -1) return 0; // continue
      var classAttr = openingElement.attributes[classAttrIndex];
      if (!isStaticClassName(t, classAttr)) return 0; // continue
      var classValue = getStaticClassNameValue(t, classAttr);
      if (!classValue || !areAllClassesStatic(stylesheet, classValue)) return 0; // continue
      var staticStyles = computeStaticStyles(stylesheet, classValue);
      if (!staticStyles || Object.keys(staticStyles).length === 0) return 0; // continue
      var styleAST = objectToAST(t, staticStyles);

      // Find existing style prop if present
      var existingStyle = openingElement.attributes.find(function (attr) {
        var _attr$name2;
        return t.isJSXAttribute(attr) && ((_attr$name2 = attr.name) === null || _attr$name2 === void 0 ? void 0 : _attr$name2.name) === styleProp;
      });
      if (existingStyle) {
        var currentVal = t.isJSXExpressionContainer(existingStyle.value) ? existingStyle.value.expression : existingStyle.value;
        existingStyle.value = t.jsxExpressionContainer(t.arrayExpression([styleAST, currentVal]));
      } else {
        openingElement.attributes.push(t.jsxAttribute(t.jsxIdentifier(styleProp), t.jsxExpressionContainer(styleAST)));
      }

      // Remove the static class attribute to achieve zero runtime parsing
      openingElement.attributes.splice(classAttrIndex, 1);
    },
    _ret;
  for (var _i = 0, _classPropMappings = classPropMappings; _i < _classPropMappings.length; _i++) {
    _ret = _loop();
    if (_ret === 0) continue;
  }
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
    var _attr$name3;
    return t.isJSXAttribute(attr) && ((_attr$name3 = attr.name) === null || _attr$name3 === void 0 ? void 0 : _attr$name3.name) === "className";
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
    var _attr$name4;
    return t.isJSXAttribute(attr) && ((_attr$name4 = attr.name) === null || _attr$name4 === void 0 ? void 0 : _attr$name4.name) === "inheritStyle";
  });

  // Get style attribute
  var styleAttr = openingElement.attributes.find(function (attr) {
    var _attr$name5;
    return t.isJSXAttribute(attr) && ((_attr$name5 = attr.name) === null || _attr$name5 === void 0 ? void 0 : _attr$name5.name) === "style";
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
    var _attr$name6;
    return ((_attr$name6 = attr.name) === null || _attr$name6 === void 0 ? void 0 : _attr$name6.name) === "inheritStyle";
  });
  var className = openingElement.attributes.find(function (attr) {
    var _attr$name7;
    return ((_attr$name7 = attr.name) === null || _attr$name7 === void 0 ? void 0 : _attr$name7.name) === "className";
  });
  var style = openingElement.attributes.find(function (attr) {
    var _attr$name8;
    return ((_attr$name8 = attr.name) === null || _attr$name8 === void 0 ? void 0 : _attr$name8.name) === "style";
  });
  return t.callExpression(state.getStyleId, [state.stylesheetId, t.arrayExpression([t.arrayExpression([propInheritStyle || t.nullLiteral(), inheritStyle && inheritStyle.value.expression || t.nullLiteral()]), className && (t.isStringLiteral(className.value) ? t.stringLiteral(className.value.value) : className.value.expression) || t.nullLiteral(), style && style.value.expression || t.nullLiteral(), t.isJSXIdentifier(elementName) ? t.stringLiteral(elementName.name) : t.isJSXMemberExpression(elementName) ? t.stringLiteral("".concat(elementName.object.name, ".").concat(elementName.property.name)) : t.stringLiteral("Unknown")])]);
}
function getInheritStyleExpression(path, state, t) {
  var _inheritStyle$value, _styleAttr$value2;
  var openingElement = path.node.openingElement;
  var inheritStyle = openingElement.attributes.find(function (attr) {
    var _attr$name9;
    return ((_attr$name9 = attr.name) === null || _attr$name9 === void 0 ? void 0 : _attr$name9.name) === "inheritStyle";
  });
  var propInheritStyle = getMemoizedInheritStyleExpression(path, t);
  var inheritStyleExpr = (inheritStyle === null || inheritStyle === void 0 || (_inheritStyle$value = inheritStyle.value) === null || _inheritStyle$value === void 0 ? void 0 : _inheritStyle$value.expression) || propInheritStyle;
  var classNameAttr = openingElement.attributes.find(function (attr) {
    var _attr$name0;
    return ((_attr$name0 = attr.name) === null || _attr$name0 === void 0 ? void 0 : _attr$name0.name) === "className";
  });
  var styleAttr = openingElement.attributes.find(function (attr) {
    var _attr$name1;
    return ((_attr$name1 = attr.name) === null || _attr$name1 === void 0 ? void 0 : _attr$name1.name) === "style";
  });
  return t.callExpression(state.getInheritStyleId, [t.callExpression(state.getStyleId, [state.stylesheetId, t.arrayExpression([inheritStyleExpr || t.nullLiteral(), (classNameAttr === null || classNameAttr === void 0 ? void 0 : classNameAttr.value) && (t.isStringLiteral(classNameAttr.value) ? t.stringLiteral(classNameAttr.value.value) : classNameAttr.value.expression) || t.nullLiteral(), (styleAttr === null || styleAttr === void 0 || (_styleAttr$value2 = styleAttr.value) === null || _styleAttr$value2 === void 0 ? void 0 : _styleAttr$value2.expression) || t.nullLiteral(), t.isJSXIdentifier(openingElement.name) ? t.stringLiteral(openingElement.name.name) : t.isJSXMemberExpression(openingElement.name) ? t.stringLiteral("".concat(openingElement.name.object.name, ".").concat(openingElement.name.property.name)) : t.stringLiteral("Unknown")])])]);
}
function getRootInheritStyleExpression(path, t) {
  var propInheritStyle = getMemoizedInheritStyleExpression(path, t);
  return propInheritStyle || t.identifier("undefined");
}