"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getStyleExpression = getStyleExpression;
exports.isFragmentElement = isFragmentElement;
exports.isImportOrRequire = isImportOrRequire;
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

// Memoization map for inherit style expressions per function node
var inheritStyleMemo = new WeakMap();
function getMemoizedInheritStyleExpression(path, t) {
  // Traverse up to find the nearest function node
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

  // Memoize per function node
  if (inheritStyleMemo.has(funcPath.node)) {
    return inheritStyleMemo.get(funcPath.node);
  }
  var result;
  // Determine the parameter structure
  var params = funcPath.node.params;

  // TODO: wrong implementation
  // Special handling for useMemo/useCallback
  // Check if we're inside a useMemo or useCallback call
  var parentPath = funcPath.parentPath;

  // Check if this function is the first argument to useMemo/useCallback
  if (parentPath && parentPath.isCallExpression() && parentPath.node.callee && parentPath.node.callee.type === "Identifier" && ["useMemo", "useCallback"].includes(parentPath.node.callee.name)) {
    // Create a safe temporary identifier to hold inheritStyle
    // This handles the special case for React hooks that take function arguments
    // return t.memberExpression(t.identifier("props"), t.identifier("inheritStyle"), false, false);
    result = undefined;
  } else if (params.length === 0) {
    // Case 1: No props - () => {}
    // Add a props parameter with destructuring to the function
    funcPath.node.params = [t.identifier("props")];
    result = t.memberExpression(t.identifier("props"), t.identifier("inheritStyle"), false, false);
  } else if (params.length > 0) {
    var firstParam = params[0];
    if (t.isIdentifier(firstParam)) {
      // Case 2: With props - (props) => {}
      result = t.memberExpression(firstParam, t.identifier("inheritStyle"), false, false);
    } else if (t.isObjectPattern(firstParam)) {
      // Case 3 & 4: Destructured props
      var restElement = firstParam.properties.find(function (p) {
        return t.isRestElement(p);
      });
      if (restElement) {
        // Case 4: With rest parameter - ({ abc, ...rest }) => {}
        result = t.memberExpression(restElement.argument, t.identifier("inheritStyle"), false, false);
      } else {
        // Case 3: Parsed props without rest - ({ abc }) => {}
        // Add rest parameter to the destructuring
        var restProp = t.restElement(t.identifier("rest"));
        firstParam.properties.push(restProp);
        result = t.memberExpression(t.identifier("rest"), t.identifier("inheritStyle"), false, false);
      }
    }
  }
  inheritStyleMemo.set(funcPath.node, result);
  return result;
}
function getStyleExpression(path, state, t) {
  var openingElement = path.node.openingElement;
  var elementName = openingElement.name;
  var propInheritStyle = getMemoizedInheritStyleExpression(path, t);
  var inheritStyle = openingElement.attributes.find(function (attr) {
    var _attr$name;
    return ((_attr$name = attr.name) === null || _attr$name === void 0 ? void 0 : _attr$name.name) === "inheritStyle";
  });
  var className = openingElement.attributes.find(function (attr) {
    var _attr$name2;
    return ((_attr$name2 = attr.name) === null || _attr$name2 === void 0 ? void 0 : _attr$name2.name) === "className";
  });
  var style = openingElement.attributes.find(function (attr) {
    var _attr$name3;
    return ((_attr$name3 = attr.name) === null || _attr$name3 === void 0 ? void 0 : _attr$name3.name) === "style";
  });

  // compute style and inheritStyle
  return t.callExpression(state.getStyleId, [state.stylesheetId, t.arrayExpression([t.arrayExpression([propInheritStyle || null, inheritStyle && inheritStyle.value && inheritStyle.value.expression || null]), className && (t.isStringLiteral(className.value) ? t.stringLiteral(className.value.value) : className.value.expression) || null, style && style.value.expression || null, t.isJSXIdentifier(elementName) ? t.stringLiteral(elementName.name) : t.isJSXMemberExpression(elementName) ? t.stringLiteral("".concat(elementName.object.name, ".").concat(elementName.property.name)) : t.stringLiteral("Unknown")])]);
}