/**
 * Build-time CSS transformations
 * Pre-computes static values during Metro transform to reduce runtime work.
 */

// ============================================================================
// Regex patterns (compiled once)
// ============================================================================
const remOrEmUnitRe = /([\d.]+)(rem|em)/g;
const pxUnitRe = /^([\d.]+)px$/;
const viewportUnitRe = /([\d.]+)(vh|vw|vmin|vmax)/;
const cssVarRe = /var\(/;
const calcRe = /calc\(/;
const colorRe1 = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/g;
const colorRe2 = /rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)/g;
const borderRe = /^(\S+)\s+(solid|dashed|dotted)\s+(\S+)$/;
const borderSimpleRe = /^(\S+)\s+(solid|dashed|dotted)$/;
const spacingRe = /^\s*(\S+)(?:\s+(\S+)(?:\s+(\S+)(?:\s+(\S+))?)?)?\s*$/;
const fontWeightRe = /^(normal|bold|[1-9]00)$/;
const transformFnRe =
  /(perspective|rotate[XYZ]?|scale[XY]?|translate[XY]?|skew[XY]?)\s*\(\s*([^,)]+)(?:,\s*([^)]+))?\)/g;

const UNSUPPORTED_PROPERTIES = ["outline"];

// ============================================================================
// Helpers
// ============================================================================
const itohex = (component) => {
  const hex = Number(component).toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
};

const toNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return value;
  const num = Number(trimmed);
  return !isNaN(num) ? num : value;
};

// ============================================================================
// Check if value needs runtime processing
// ============================================================================
export function isDynamicValue(value) {
  if (typeof value !== "string") return false;
  return viewportUnitRe.test(value) || cssVarRe.test(value);
}

export function hasMediaQuery(declaration) {
  if (!declaration || typeof declaration !== "object") return false;
  return Object.keys(declaration).some((key) => key.startsWith("@media"));
}

// ============================================================================
// Static transformations (can be done at build time)
// ============================================================================

/** Remove !important */
export function removeImportant(value) {
  if (typeof value !== "string") return value;
  return value.replace(/\s*!important\s*/g, "").trim();
}

/** Convert rem/em to px (1rem = 16px) */
export function transformRemEm(value) {
  if (typeof value !== "string") return value;
  return value.replace(remOrEmUnitRe, (_, num) => `${parseFloat(num) * 16}px`);
}

/** Remove px unit and convert to number */
export function removePxUnit(value) {
  if (typeof value !== "string") return value;
  const match = pxUnitRe.exec(value);
  if (match) return parseFloat(match[1]);
  return value;
}

/** Transform rgba/rgb to hex */
export function transformColor(value) {
  if (typeof value !== "string") return value;

  // Reset lastIndex for global regexes
  colorRe1.lastIndex = 0;
  colorRe2.lastIndex = 0;

  value = value.replace(colorRe1, (_, r, g, b, a) => {
    const alpha = parseFloat(a);
    if (isNaN(alpha) || alpha >= 1) return `#${itohex(r)}${itohex(g)}${itohex(b)}`;
    return `#${itohex(r)}${itohex(g)}${itohex(b)}${itohex(Math.round(alpha * 255))}`;
  });

  value = value.replace(colorRe2, (_, r, g, b, a) => {
    const alpha = parseFloat(a);
    if (isNaN(alpha) || alpha >= 1) return `#${itohex(r)}${itohex(g)}${itohex(b)}`;
    return `#${itohex(r)}${itohex(g)}${itohex(b)}${itohex(Math.round(alpha * 255))}`;
  });

  return value;
}

/** Transform position: fixed → absolute */
export function transformPosition(property, value) {
  if (property === "position" && value === "fixed") return "absolute";
  return value;
}

/** Transform border-radius with % → 9999 */
export function transformBorderRadius(property, value) {
  if (property.toLowerCase().endsWith("radius") && typeof value === "string" && value.includes("%")) {
    return 9999;
  }
  return value;
}

/** Transform opacity with % → decimal */
export function transformOpacity(property, value) {
  if (property === "opacity" && typeof value === "string" && value.endsWith("%")) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return num / 100;
    }
  }
  return value;
}

/** Get aliased property name */
export function getAliasedProperty(property) {
  if (property === "background") return "backgroundColor";
  return property;
}

/** Check if property is supported */
export function isPropertySupported(property, value) {
  if (UNSUPPORTED_PROPERTIES.includes(property)) return false;
  if (value === undefined || value === null) return false;
  if (typeof value === "object") return false; // Skip nested objects (media queries)
  return true;
}

// ============================================================================
// Shorthand expansion
// ============================================================================

/** Expand border shorthand */
export function expandBorder(property, value) {
  if (!["border", "borderTop", "borderBottom", "borderLeft", "borderRight"].includes(property)) {
    return null;
  }

  if (value === "none" || value === "0") {
    return { [`${property}Width`]: 0 };
  }

  // Try "width style color" format
  let match = borderRe.exec(String(value));
  if (match) {
    const [, width, style, color] = match;
    return {
      [`${property}Width`]: toNumber(width),
      [`${property}Style`]: style,
      [`${property}Color`]: color,
    };
  }

  // Try "width style" format
  match = borderSimpleRe.exec(String(value));
  if (match) {
    const [, width, style] = match;
    return {
      [`${property}Width`]: toNumber(width),
      [`${property}Style`]: style,
    };
  }

  // Single value (width only)
  return { [`${property}Width`]: toNumber(value) };
}

function splitSpacingValues(str) {
  const parts = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === "(") {
      depth++;
      current += char;
    } else if (char === ")") {
      depth--;
      current += char;
    } else if (char === " " && depth === 0) {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }
  if (current) {
    parts.push(current);
  }
  return parts.filter(Boolean);
}

/** Expand margin/padding shorthand */
export function expandSpacing(property, value) {
  if (!["padding", "margin"].includes(property)) return null;

  const parts = splitSpacingValues(String(value));
  if (parts.length === 0) return null;

  const top = parts[0];
  const right = parts[1] !== undefined ? parts[1] : top;
  const bottom = parts[2] !== undefined ? parts[2] : top;
  const left = parts[3] !== undefined ? parts[3] : right;

  return {
    [`${property}Top`]: toNumber(top),
    [`${property}Right`]: toNumber(right),
    [`${property}Bottom`]: toNumber(bottom),
    [`${property}Left`]: toNumber(left),
  };
}

/** Expand fontWeight */
export function expandFontWeight(property, value) {
  if (property !== "fontWeight") return null;
  if (!fontWeightRe.test(String(value))) return null;
  return { fontWeight: String(value) };
}

/** Expand flex */
export function expandFlex(property, value) {
  if (property !== "flex") return null;
  return { flex: parseInt(value, 10) };
}

/** Expand transform property */
export function expandTransform(property, value) {
  if (property !== "transform") return null;
  if (typeof value !== "string") return null;

  // If contains dynamic values, skip
  if (isDynamicValue(value)) return null;

  const transforms = [];
  let match;
  const re = new RegExp(transformFnRe.source, "g");

  while ((match = re.exec(value)) !== null) {
    const [, fn, val1, val2] = match;

    if (fn === "translate" || fn === "skew") {
      transforms.push({ [`${fn}X`]: toNumber(val1) });
      if (val2 !== undefined) {
        transforms.push({ [`${fn}Y`]: toNumber(val2) });
      }
    } else {
      transforms.push({ [fn]: toNumber(val1) });
    }
  }

  return transforms.length > 0 ? { transform: transforms } : null;
}

/** Expand logical properties like paddingInline, marginInline, paddingBlock, marginBlock */
export function expandLogicalProperty(property, value) {
  if (
    ![
      "paddingInline",
      "marginInline",
      "paddingBlock",
      "marginBlock",
      "paddingInlineStart",
      "paddingInlineEnd",
      "marginInlineStart",
      "marginInlineEnd",
      "insetInline",
      "insetInlineStart",
      "insetInlineEnd",
      "insetBlock",
      "insetBlockStart",
      "insetBlockEnd",
    ].includes(property)
  ) {
    return null;
  }

  const strValue = String(value).trim();
  const parts = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < strValue.length; i++) {
    const char = strValue[i];
    if (char === "(") {
      depth++;
      current += char;
    } else if (char === ")") {
      depth--;
      current += char;
    } else if (char === " " && depth === 0) {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }
  if (current) {
    parts.push(current);
  }

  const cleanedParts = parts.filter(Boolean);

  if (property === "paddingInlineStart") return { paddingStart: toNumber(value) };
  if (property === "paddingInlineEnd") return { paddingEnd: toNumber(value) };
  if (property === "marginInlineStart") return { marginStart: toNumber(value) };
  if (property === "marginInlineEnd") return { marginEnd: toNumber(value) };
  if (property === "insetInlineStart") return { start: toNumber(value) };
  if (property === "insetInlineEnd") return { end: toNumber(value) };
  if (property === "insetBlockStart") return { top: toNumber(value) };
  if (property === "insetBlockEnd") return { bottom: toNumber(value) };

  if (property === "paddingInline") {
    if (cleanedParts.length === 1) {
      return { paddingHorizontal: toNumber(cleanedParts[0]) };
    }
    if (cleanedParts.length >= 2) {
      return {
        paddingStart: toNumber(cleanedParts[0]),
        paddingEnd: toNumber(cleanedParts[1]),
      };
    }
  }

  if (property === "marginInline") {
    if (cleanedParts.length === 1) {
      return { marginHorizontal: toNumber(cleanedParts[0]) };
    }
    if (cleanedParts.length >= 2) {
      return {
        marginStart: toNumber(cleanedParts[0]),
        marginEnd: toNumber(cleanedParts[1]),
      };
    }
  }

  if (property === "paddingBlock") {
    if (cleanedParts.length === 1) {
      return { paddingVertical: toNumber(cleanedParts[0]) };
    }
    if (cleanedParts.length >= 2) {
      return {
        paddingTop: toNumber(cleanedParts[0]),
        paddingBottom: toNumber(cleanedParts[1]),
      };
    }
  }

  if (property === "marginBlock") {
    if (cleanedParts.length === 1) {
      return { marginVertical: toNumber(cleanedParts[0]) };
    }
    if (cleanedParts.length >= 2) {
      return {
        marginTop: toNumber(cleanedParts[0]),
        marginBottom: toNumber(cleanedParts[1]),
      };
    }
  }

  if (property === "insetInline") {
    if (cleanedParts.length === 1) {
      return {
        left: toNumber(cleanedParts[0]),
        right: toNumber(cleanedParts[0]),
      };
    }
    if (cleanedParts.length >= 2) {
      return {
        start: toNumber(cleanedParts[0]),
        end: toNumber(cleanedParts[1]),
      };
    }
  }

  if (property === "insetBlock") {
    if (cleanedParts.length === 1) {
      return {
        top: toNumber(cleanedParts[0]),
        bottom: toNumber(cleanedParts[0]),
      };
    }
    if (cleanedParts.length >= 2) {
      return {
        top: toNumber(cleanedParts[0]),
        bottom: toNumber(cleanedParts[1]),
      };
    }
  }

  return null;
}

// ============================================================================
// Main pre-computation function
// ============================================================================

/**
 * Pre-compute a single property value
 * Returns { property, value, isDynamic }
 */
export function precomputeValue(property, value) {
  // Handle non-string values
  if (typeof value !== "string") {
    return { property, value, isDynamic: false };
  }

  // Check if dynamic (needs runtime)
  const isDynamic = isDynamicValue(value) || calcRe.test(value);

  // Apply static transformations (even for dynamic values, some parts can be pre-processed)
  let processed = value;
  processed = removeImportant(processed);
  processed = transformRemEm(processed);
  processed = transformColor(processed);
  processed = transformPosition(property, processed);
  processed = transformBorderRadius(property, processed);
  processed = transformOpacity(property, processed);

  // Get aliased property
  const aliasedProp = getAliasedProperty(property);

  // For static values, remove px and convert to number
  if (!isDynamic) {
    processed = removePxUnit(processed);
    if (typeof processed === "string") {
      processed = toNumber(processed);
    }
  }

  return { property: aliasedProp, value: processed, isDynamic };
}

/**
 * Pre-compute an entire declaration object
 * Returns { _static: {...}, _dynamic: {...}, _hasDynamic: boolean }
 */
export function precomputeDeclaration(declaration) {
  if (!declaration || typeof declaration !== "object") {
    return { _static: {}, _dynamic: {}, _hasDynamic: false };
  }

  const staticProps = {};
  const dynamicProps = {};
  let hasDynamic = false;

  for (const [property, value] of Object.entries(declaration)) {
    // Handle media queries - always dynamic (needs runtime evaluation)
    if (property.startsWith("@media")) {
      // Recursively pre-compute media query content
      const mediaResult = precomputeDeclaration(value);
      dynamicProps[property] = {
        _static: mediaResult._static,
        _dynamic: mediaResult._dynamic,
      };
      hasDynamic = true;
      continue;
    }

    // Keep CSS variables as-is
    if (property.startsWith("--")) {
      staticProps[property] = value;
      continue;
    }

    // Skip unsupported
    if (!isPropertySupported(property, value)) continue;

    // Pre-compute the value
    const { property: prop, value: val, isDynamic } = precomputeValue(property, value);

    // Try to expand shorthand
    const expanded =
      expandBorder(prop, val) ||
      expandSpacing(prop, val) ||
      expandFontWeight(prop, val) ||
      expandFlex(prop, val) ||
      expandTransform(prop, val) ||
      expandLogicalProperty(prop, val);

    if (expanded) {
      // Add expanded properties
      for (const [expProp, expVal] of Object.entries(expanded)) {
        if (isDynamic) {
          dynamicProps[expProp] = expVal;
          hasDynamic = true;
        } else {
          staticProps[expProp] = expVal;
        }
      }
    } else {
      // Single property
      if (isDynamic) {
        dynamicProps[prop] = val;
        hasDynamic = true;
      } else {
        staticProps[prop] = val;
      }
    }
  }

  return { _static: staticProps, _dynamic: dynamicProps, _hasDynamic: hasDynamic };
}

export default {
  isDynamicValue,
  hasMediaQuery,
  precomputeValue,
  precomputeDeclaration,
};
