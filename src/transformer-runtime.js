let RN = {};
try {
  RN = require("react-native");
} catch {
  // Safe in Node/Babel build environment
}

const Appearance = RN.Appearance || { getColorScheme: () => "light" };
const Dimensions = RN.Dimensions || { get: () => ({ width: 375, height: 812 }) };

// ============================================================================
// Constants
// ============================================================================
const INHERIT_PROPERTIES = [
  "color",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontWeight",
  "fontVariant",
  "letterSpacing",
  "lineHeight",
  "textAlign",
  "textTransform",
];

// ============================================================================
// Cached Dimensions and Appearance
// ============================================================================
let cachedDimensions = null;
let cachedColorScheme = null;
let TRANSFORM_CACHE = {};
let currentCacheKey = null;

function getDimensions() {
  if (!cachedDimensions) {
    try {
      cachedDimensions = Dimensions?.get?.("window") || { width: 375, height: 812 };
    } catch {
      cachedDimensions = { width: 375, height: 812 };
    }
  }
  return cachedDimensions;
}

function getColorScheme() {
  if (cachedColorScheme === null) {
    try {
      cachedColorScheme = Appearance?.getColorScheme?.() || "light";
    } catch {
      cachedColorScheme = "light";
    }
  }
  return cachedColorScheme;
}

function getCacheKey() {
  const { width, height } = getDimensions();
  const colorScheme = getColorScheme();
  return `${width}x${height}:${colorScheme}`;
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

try {
  Dimensions?.addEventListener?.("change", invalidateCache);
  Appearance?.addChangeListener?.(invalidateCache);
} catch {}

// ============================================================================
// Flatten Style
// ============================================================================
function getFlattenStyle(declarations) {
  if (!Array.isArray(declarations)) {
    return declarations;
  }

  const result = {};

  function merge(item) {
    if (!item) return;
    if (Array.isArray(item)) {
      for (let i = 0; i < item.length; i++) {
        merge(item[i]);
      }
    } else {
      Object.assign(result, item);
    }
  }

  for (let i = 0; i < declarations.length; i++) {
    merge(declarations[i]);
  }

  const borderStyles = ["borderBottomStyle", "borderTopStyle", "borderLeftStyle", "borderRightStyle"];
  for (const bs of borderStyles) {
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
// Main Native Rust Stylesheet Transform
// ============================================================================
function transformStyles(stylesheet, classNames) {
  if (!stylesheet || !classNames) return undefined;
  if (stylesheet.default && typeof stylesheet.default === "object" && !stylesheet[":root"]) {
    stylesheet = stylesheet.default;
  }

  const { width, height } = getDimensions();
  const colorScheme = getColorScheme();

  const cacheKey = getCacheKey();
  if (cacheKey !== currentCacheKey) {
    TRANSFORM_CACHE = {};
    currentCacheKey = cacheKey;
  }

  if (TRANSFORM_CACHE[classNames] !== undefined) {
    return TRANSFORM_CACHE[classNames];
  }

  const classes = classNames.trim().split(/\s+/);
  const resolved = {};

  for (const cls of classes) {
    if (!cls) continue;
    const entry = stylesheet[cls];
    if (!entry) continue;

    if (entry._static) {
      Object.assign(resolved, entry._static);
    } else if (entry._dynamic) {
      Object.assign(resolved, entry._dynamic);
    } else if (typeof entry === "object") {
      Object.assign(resolved, entry);
    }
  }

  const result = Object.keys(resolved).length > 0 ? resolved : undefined;
  TRANSFORM_CACHE[classNames] = result;
  return result;
}

// ============================================================================
// Inherit Style
// ============================================================================
function getInheritStyle(declarations) {
  if (!declarations) return undefined;

  const inheritDeclarations = {};
  for (const key of INHERIT_PROPERTIES) {
    if (declarations[key] !== undefined) {
      inheritDeclarations[key] = declarations[key];
    }
  }

  return Object.keys(inheritDeclarations).length > 0 ? inheritDeclarations : undefined;
}

// ============================================================================
// Main Entry Point
// ============================================================================
function getStyle(stylesheet, [inheritStyle, className, style]) {
  const inherited = getInheritStyle(getFlattenStyle(inheritStyle));
  const transformed = transformStyles(stylesheet, className);
  const result = getFlattenStyle([inherited, transformed, style]);
  return result;
}

// ============================================================================
// Lightweight Merge for Static Styles
// ============================================================================
function mergeStyles(inheritStyle, staticStyles, inlineStyle) {
  if (!inheritStyle && !inlineStyle) {
    return staticStyles;
  }

  let inherited;
  if (inheritStyle) {
    const flatInherit = getFlattenStyle(inheritStyle);
    if (flatInherit) {
      inherited = {};
      for (const key of INHERIT_PROPERTIES) {
        if (flatInherit[key] !== undefined) {
          inherited[key] = flatInherit[key];
        }
      }
      if (Object.keys(inherited).length === 0) {
        inherited = undefined;
      }
    }
  }

  if (!inherited && !inlineStyle) {
    return staticStyles;
  }

  const result = {};
  if (inherited) Object.assign(result, inherited);
  if (staticStyles) {
    for (const key in staticStyles) {
      if (!key.startsWith("--")) {
        result[key] = staticStyles[key];
      }
    }
  }
  if (inlineStyle) Object.assign(result, inlineStyle);

  return Object.keys(result).length > 0 ? result : undefined;
}

export default {
  getFlattenStyle,
  getStyle,
  getInheritStyle,
  mergeStyles,
  clearCache,
};
