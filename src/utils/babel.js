export function isImportOrRequire(statement) {
  return (
    statement.isImportDeclaration() ||
    statement.node?.declarations?.[0]?.init?.callee?.name === "require"
  );
}

export function isFragmentElement(t, elementName) {
  return (
    (t.isJSXIdentifier(elementName) &&
      (elementName.name === "Fragment" || elementName.name === "React.Fragment")) ||
    (t.isJSXMemberExpression(elementName) &&
      elementName.object.name === "React" &&
      elementName.property.name === "Fragment") ||
    t.isJSXIdentifier(elementName, { name: "" }) // JSX shorthand fragment
  );
}

// Memoization map for inherit style expressions per function node
const inheritStyleMemo = new WeakMap();

function getMemoizedInheritStyleExpression(path, t) {
  // Traverse up to find the nearest function node
  let currentPath = path;
  let funcPath = null;
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

  let result;
  // Determine the parameter structure
  const params = funcPath.node.params;

  // TODO: wrong implementation
  // Special handling for useMemo/useCallback
  // Check if we're inside a useMemo or useCallback call
  let parentPath = funcPath.parentPath;

  // Check if this function is the first argument to useMemo/useCallback
  if (
    parentPath &&
    parentPath.isCallExpression() &&
    parentPath.node.callee &&
    parentPath.node.callee.type === "Identifier" &&
    ["useMemo", "useCallback"].includes(parentPath.node.callee.name)
  ) {
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
    const firstParam = params[0];
    if (t.isIdentifier(firstParam)) {
      // Case 2: With props - (props) => {}
      result = t.memberExpression(firstParam, t.identifier("inheritStyle"), false, false);
    } else if (t.isObjectPattern(firstParam)) {
      // Case 3 & 4: Destructured props
      const restElement = firstParam.properties.find((p) => t.isRestElement(p));
      if (restElement) {
        // Case 4: With rest parameter - ({ abc, ...rest }) => {}
        result = t.memberExpression(
          restElement.argument,
          t.identifier("inheritStyle"),
          false,
          false,
        );
      } else {
        // Case 3: Parsed props without rest - ({ abc }) => {}
        // Add rest parameter to the destructuring
        const restProp = t.restElement(t.identifier("rest"));
        firstParam.properties.push(restProp);
        result = t.memberExpression(
          t.identifier("rest"),
          t.identifier("inheritStyle"),
          false,
          false,
        );
      }
    }
  }

  inheritStyleMemo.set(funcPath.node, result);
  return result;
}

export function getStyleExpression(path, state, t) {
  const openingElement = path.node.openingElement;
  const elementName = openingElement.name;

  const propInheritStyle = getMemoizedInheritStyleExpression(path, t);

  const inheritStyle = openingElement.attributes.find((attr) => attr.name?.name === "inheritStyle");
  const className = openingElement.attributes.find((attr) => attr.name?.name === "className");
  const style = openingElement.attributes.find((attr) => attr.name?.name === "style");

  // compute style and inheritStyle
  return t.callExpression(state.getStyleId, [
    state.stylesheetId,
    t.arrayExpression([
      t.arrayExpression([
        propInheritStyle || null,
        (inheritStyle && inheritStyle.value.expression) || null,
      ]),
      (className &&
        (t.isStringLiteral(className.value)
          ? t.stringLiteral(className.value.value)
          : className.value.expression)) ||
        null,
      (style && style.value.expression) || null,
      t.isJSXIdentifier(elementName)
        ? t.stringLiteral(elementName.name)
        : t.isJSXMemberExpression(elementName)
          ? t.stringLiteral(`${elementName.object.name}.${elementName.property.name}`)
          : t.stringLiteral("Unknown"),
    ]),
  ]);
}
