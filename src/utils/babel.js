import Runtime from "../transformer-runtime.js";

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

export function isRootLevelJSXElement(path) {
  let currentPath = path;

  while (currentPath.parentPath) {
    const parent = currentPath.parentPath;

    if (parent.isReturnStatement()) return true;
    if (parent.isArrowFunctionExpression() && parent.node.body === currentPath.node) return true;
    if (parent.isJSXElement() && parent !== path) return false;

    if (
      parent.isConditionalExpression() ||
      parent.isLogicalExpression() ||
      parent.isParenthesizedExpression()
    ) {
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
export function isStaticClassName(t, classNameAttr) {
  if (!classNameAttr) return false;
  if (t.isStringLiteral(classNameAttr.value)) return true;
  if (
    t.isJSXExpressionContainer(classNameAttr.value) &&
    t.isStringLiteral(classNameAttr.value.expression)
  ) {
    return true;
  }
  return false;
}

/**
 * Get static className string value
 */
export function getStaticClassNameValue(t, classNameAttr) {
  if (!classNameAttr) return null;
  if (t.isStringLiteral(classNameAttr.value)) return classNameAttr.value.value;
  if (
    t.isJSXExpressionContainer(classNameAttr.value) &&
    t.isStringLiteral(classNameAttr.value.expression)
  ) {
    return classNameAttr.value.expression.value;
  }
  return null;
}

/**
 * Check if a class is fully static (no dynamic breakpoint / dark mode queries)
 */
export function isClassStatic(stylesheet, className) {
  if (!className) return true;
  if (
    className === "group" ||
    className.startsWith("group") ||
    className.startsWith("peer") ||
    className.startsWith("active:") ||
    className.startsWith("pressed:") ||
    className.startsWith("disabled:") ||
    className.startsWith("dark:") ||
    className.startsWith("light:") ||
    className.startsWith("sm:") ||
    className.startsWith("md:") ||
    className.startsWith("lg:") ||
    className.startsWith("xl:") ||
    className.startsWith("2xl:") ||
    className.startsWith("portrait:") ||
    className.startsWith("landscape:")
  ) {
    return false;
  }
  return true;
}

/**
 * Check if all classes in className string are static
 */
export function areAllClassesStatic(stylesheet, classNameValue) {
  if (!classNameValue || !stylesheet) return false;
  const classes = classNameValue.trim().split(/\s+/).filter(Boolean);
  return classes.every((cls) => isClassStatic(stylesheet, cls));
}

/**
 * Compute merged static styles from className string using Runtime compiler
 */
export function computeStaticStyles(stylesheet, classNameValue) {
  if (!classNameValue || !stylesheet) return {};
  try {
    const computed = Runtime.getStyle(stylesheet, [undefined, classNameValue, undefined]);
    return computed || {};
  } catch {
    return {};
  }
}

/**
 * Inlines static className and contentContainerClassName attributes directly into styles
 */
export function inlineStaticAttributes(path, state, t) {
  if (!state.stylesheetData) return;

  const openingElement = path.node.openingElement;
  const stylesheet = state.stylesheetData;

  const classPropMappings = [
    { classProp: "className", styleProp: "style" },
    { classProp: "contentContainerClassName", styleProp: "contentContainerStyle" },
  ];

  for (const { classProp, styleProp } of classPropMappings) {
    const classAttrIndex = openingElement.attributes.findIndex(
      (attr) => t.isJSXAttribute(attr) && attr.name?.name === classProp,
    );
    if (classAttrIndex === -1) continue;

    const classAttr = openingElement.attributes[classAttrIndex];
    if (!isStaticClassName(t, classAttr)) continue;

    const classValue = getStaticClassNameValue(t, classAttr);
    if (!classValue || !areAllClassesStatic(stylesheet, classValue)) continue;

    const staticStyles = computeStaticStyles(stylesheet, classValue);
    if (!staticStyles || Object.keys(staticStyles).length === 0) continue;

    const styleAST = objectToAST(t, staticStyles);

    // Find existing style prop if present
    const existingStyle = openingElement.attributes.find(
      (attr) => t.isJSXAttribute(attr) && attr.name?.name === styleProp,
    );

    if (existingStyle) {
      const currentVal = t.isJSXExpressionContainer(existingStyle.value)
        ? existingStyle.value.expression
        : existingStyle.value;
      existingStyle.value = t.jsxExpressionContainer(
        t.arrayExpression([styleAST, currentVal]),
      );
    } else {
      openingElement.attributes.push(
        t.jsxAttribute(t.jsxIdentifier(styleProp), t.jsxExpressionContainer(styleAST)),
      );
    }

    // Remove the static class attribute to achieve zero runtime parsing
    openingElement.attributes.splice(classAttrIndex, 1);
  }
}

/**
 * Convert JavaScript object to Babel AST
 */
export function objectToAST(t, obj) {
  if (obj === null || obj === undefined) return t.nullLiteral();

  if (Array.isArray(obj)) {
    return t.arrayExpression(obj.map((item) => objectToAST(t, item)));
  }

  if (typeof obj === "object") {
    return t.objectExpression(
      Object.entries(obj).map(([key, value]) =>
        t.objectProperty(
          /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? t.identifier(key) : t.stringLiteral(key),
          objectToAST(t, value),
        ),
      ),
    );
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
export function tryGetStaticStyleInfo(path, state, t) {
  const openingElement = path.node.openingElement;

  const classNameAttr = openingElement.attributes.find(
    (attr) => t.isJSXAttribute(attr) && attr.name?.name === "className",
  );

  // Check if className is static
  if (!isStaticClassName(t, classNameAttr)) return null;

  // Get stylesheet
  const stylesheet = state.stylesheetData;
  if (!stylesheet) return null;

  const classNameValue = getStaticClassNameValue(t, classNameAttr);
  if (!classNameValue) return null;

  // Check if all classes are fully static
  if (!areAllClassesStatic(stylesheet, classNameValue)) return null;

  // Compute static styles from className
  const staticStyles = computeStaticStyles(stylesheet, classNameValue);

  // Get inheritStyle attribute (for mergeStyles call)
  const inheritStyleAttr = openingElement.attributes.find(
    (attr) => t.isJSXAttribute(attr) && attr.name?.name === "inheritStyle",
  );

  // Get style attribute
  const styleAttr = openingElement.attributes.find(
    (attr) => t.isJSXAttribute(attr) && attr.name?.name === "style",
  );

  return {
    staticStyles,
    inheritStyleAttr,
    styleAttr,
  };
}

/**
 * Generate mergeStyles(inheritStyle, staticStyles, inlineStyle) expression
 */
export function getStaticMergeExpression(path, state, t, staticInfo) {
  const { staticStyles, inheritStyleAttr, styleAttr } = staticInfo;

  // Get inheritStyle expression
  const propInheritStyle = getMemoizedInheritStyleExpression(path, t);
  const inheritStyleExpr = inheritStyleAttr?.value?.expression;

  // Build inheritStyle array: [props.inheritStyle, explicitInheritStyle]
  let inheritArg;
  if (propInheritStyle || inheritStyleExpr) {
    inheritArg = t.arrayExpression([
      propInheritStyle || t.nullLiteral(),
      inheritStyleExpr || t.nullLiteral(),
    ]);
  } else {
    inheritArg = t.nullLiteral();
  }

  // Static styles as inline object
  const staticArg =
    Object.keys(staticStyles).length > 0 ? objectToAST(t, staticStyles) : t.nullLiteral();

  // Inline style expression
  const inlineArg = styleAttr?.value?.expression || t.nullLiteral();

  // mergeStyles(inheritStyle, staticStyles, inlineStyle)
  return t.callExpression(state.mergeStylesId, [inheritArg, staticArg, inlineArg]);
}

// ============================================================================
// InheritStyle helpers
// ============================================================================

const inheritStyleMemo = new WeakMap();

function getMemoizedInheritStyleExpression(path, t) {
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

  if (inheritStyleMemo.has(funcPath.node)) {
    return inheritStyleMemo.get(funcPath.node);
  }

  let result;
  const params = funcPath.node.params;
  let parentPath = funcPath.parentPath;

  if (
    parentPath &&
    parentPath.isCallExpression() &&
    parentPath.node.callee &&
    parentPath.node.callee.type === "Identifier" &&
    ["useMemo", "useCallback"].includes(parentPath.node.callee.name)
  ) {
    result = undefined;
  } else if (params.length === 0) {
    funcPath.node.params = [t.identifier("props")];
    result = t.memberExpression(t.identifier("props"), t.identifier("inheritStyle"), false, false);
  } else if (params.length > 0) {
    const firstParam = params[0];
    if (t.isIdentifier(firstParam)) {
      result = t.memberExpression(firstParam, t.identifier("inheritStyle"), false, false);
    } else if (t.isObjectPattern(firstParam)) {
      const restElement = firstParam.properties.find((p) => t.isRestElement(p));
      if (restElement) {
        result = t.memberExpression(
          restElement.argument,
          t.identifier("inheritStyle"),
          false,
          false,
        );
      } else {
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

// ============================================================================
// Style expression generators (for dynamic/fallback cases)
// ============================================================================

export function getStyleExpression(path, state, t) {
  const openingElement = path.node.openingElement;
  const elementName = openingElement.name;

  const propInheritStyle = getMemoizedInheritStyleExpression(path, t);
  const inheritStyle = openingElement.attributes.find((attr) => attr.name?.name === "inheritStyle");
  const className = openingElement.attributes.find((attr) => attr.name?.name === "className");
  const style = openingElement.attributes.find((attr) => attr.name?.name === "style");

  return t.callExpression(state.getStyleId, [
    state.stylesheetId,
    t.arrayExpression([
      t.arrayExpression([
        propInheritStyle || t.nullLiteral(),
        (inheritStyle && inheritStyle.value.expression) || t.nullLiteral(),
      ]),
      (className &&
        (t.isStringLiteral(className.value)
          ? t.stringLiteral(className.value.value)
          : className.value.expression)) ||
        t.nullLiteral(),
      (style && style.value.expression) || t.nullLiteral(),
      t.isJSXIdentifier(elementName)
        ? t.stringLiteral(elementName.name)
        : t.isJSXMemberExpression(elementName)
          ? t.stringLiteral(`${elementName.object.name}.${elementName.property.name}`)
          : t.stringLiteral("Unknown"),
    ]),
  ]);
}

export function getInheritStyleExpression(path, state, t) {
  const openingElement = path.node.openingElement;
  const inheritStyle = openingElement.attributes.find((attr) => attr.name?.name === "inheritStyle");

  const propInheritStyle = getMemoizedInheritStyleExpression(path, t);
  const inheritStyleExpr = inheritStyle?.value?.expression || propInheritStyle;

  const classNameAttr = openingElement.attributes.find((attr) => attr.name?.name === "className");
  const styleAttr = openingElement.attributes.find((attr) => attr.name?.name === "style");

  return t.callExpression(state.getInheritStyleId, [
    t.callExpression(state.getStyleId, [
      state.stylesheetId,
      t.arrayExpression([
        inheritStyleExpr || t.nullLiteral(),
        (classNameAttr?.value &&
          (t.isStringLiteral(classNameAttr.value)
            ? t.stringLiteral(classNameAttr.value.value)
            : classNameAttr.value.expression)) ||
          t.nullLiteral(),
        styleAttr?.value?.expression || t.nullLiteral(),
        t.isJSXIdentifier(openingElement.name)
          ? t.stringLiteral(openingElement.name.name)
          : t.isJSXMemberExpression(openingElement.name)
            ? t.stringLiteral(
                `${openingElement.name.object.name}.${openingElement.name.property.name}`,
              )
            : t.stringLiteral("Unknown"),
      ]),
    ]),
  ]);
}

export function getRootInheritStyleExpression(path, t) {
  const propInheritStyle = getMemoizedInheritStyleExpression(path, t);
  return propInheritStyle || t.identifier("undefined");
}
