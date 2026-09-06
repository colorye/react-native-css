let RN = {};
try {
  RN = require("react-native");
} catch {
  // Safe in Node/Babel build environment
}

const Appearance = RN.Appearance || { getColorScheme: () => "light" };
const Dimensions = RN.Dimensions || { get: () => ({ width: 375, height: 812 }) };
const Platform = RN.Platform || { OS: "ios" };

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
  const os = Platform?.OS || "ios";
  return `${width}x${height}:${colorScheme}:${os}`;
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

  if (result.opacity !== undefined && typeof result.opacity === "string") {
    const trimmed = result.opacity.trim();
    if (trimmed.endsWith("%")) {
      const num = parseFloat(trimmed);
      if (!isNaN(num)) result.opacity = num / 100;
    } else {
      const num = parseFloat(trimmed);
      if (!isNaN(num)) result.opacity = num;
    }
  }

  if (result.letterSpacing !== undefined && typeof result.letterSpacing === "string") {
    const trimmed = result.letterSpacing.trim();
    if (trimmed === "normal") {
      result.letterSpacing = 0;
    } else if (trimmed === "inherit") {
      delete result.letterSpacing;
    } else if (trimmed.endsWith("rem") || (trimmed.endsWith("em") && !trimmed.endsWith("rem"))) {
      const num = parseFloat(trimmed);
      if (!isNaN(num)) result.letterSpacing = num * 16;
    } else if (trimmed.endsWith("px")) {
      const num = parseFloat(trimmed);
      if (!isNaN(num)) result.letterSpacing = num;
    } else {
      const num = parseFloat(trimmed);
      if (!isNaN(num)) result.letterSpacing = num;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function resolveCssVars(val, rootVars, localVars) {
  if (typeof val !== "string" || !val.includes("var(")) return val;
  let res = val;
  let iterations = 0;
  while (res.includes("var(") && iterations < 5) {
    iterations++;
    res = res.replace(/var\(\s*(--[a-zA-Z0-9_-]+)(?:\s*,\s*([^)]+))?\s*\)/g, (_, name, fb) => {
      if (localVars && localVars[name] !== undefined) return localVars[name];
      return rootVars[name] !== undefined ? rootVars[name] : (fb || "");
    });
  }
  return res;
}

function resolveCssValue(prop, val, rootVars, localVars) {
  if (typeof val !== "string") return val;
  let v = resolveCssVars(val, rootVars, localVars).trim();

  if (prop === "boxShadow") {
    const parts = v
      .split(/,(?![^(]*\))/)
      .map((p) => p.trim())
      .filter((p) => p && !p.includes("0 0 #0000") && !p.includes("0 0 #000") && !p.includes("0 0 0 0"));
    if (parts.length === 0) return undefined;
    v = parts.join(", ");
  }

  if (v.startsWith("calc(") && v.endsWith(")")) {
    let inner = v.slice(5, -1).trim();
    inner = inner.replace(/([\d.]+)rem/g, (_, n) => parseFloat(n) * 16 + "px");
    inner = inner.replace(/px/g, "");
    try {
      v = Function('"use strict"; return (' + inner + ')')();
    } catch {}
  }

  if (typeof v === "string" && v.endsWith("rem")) {
    v = parseFloat(v) * 16;
  } else if (typeof v === "string" && v.endsWith("em") && !v.endsWith("rem")) {
    v = parseFloat(v) * 16;
  } else if (typeof v === "string" && v.endsWith("px")) {
    v = parseFloat(v);
  } else if (typeof v === "string" && (v.endsWith("vh") || v.endsWith("vw"))) {
    v = parseFloat(v) + "%";
  }

  if (prop.toLowerCase().endsWith("radius") && (v === "50%" || v === "9999px" || v === 9999)) {
    return 9999;
  }
  if (prop === "letterSpacing") {
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed === "normal") return 0;
      if (trimmed === "inherit") return undefined;
      if (trimmed.endsWith("rem")) {
        const num = parseFloat(trimmed);
        if (!isNaN(num)) return num * 16;
      }
      if (trimmed.endsWith("em")) {
        const num = parseFloat(trimmed);
        if (!isNaN(num)) return num * 16;
      }
      if (trimmed.endsWith("px")) {
        const num = parseFloat(trimmed);
        if (!isNaN(num)) return num;
      }
      const num = parseFloat(trimmed);
      if (!isNaN(num)) return num;
    } else if (typeof v === "number") {
      return v;
    }
  }
  if (prop === "opacity" || prop.endsWith("Opacity")) {
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed.endsWith("%")) {
        const num = parseFloat(trimmed);
        if (!isNaN(num)) return num / 100;
      }
      const num = parseFloat(trimmed);
      if (!isNaN(num)) return num;
    } else if (typeof v === "number") {
      return v;
    }
  }
  if (prop === "scale" || prop === "scaleX" || prop === "scaleY") {
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed.endsWith("%")) {
        const num = parseFloat(trimmed);
        if (!isNaN(num)) return num / 100;
      }
      const num = parseFloat(trimmed);
      if (!isNaN(num)) return num;
    } else if (typeof v === "number") {
      return v;
    }
  }
  if (prop === "fontWeight") {
    return String(v).replace("px", "").replace("rem", "");
  }
  if (
    typeof v === "string" &&
    !isNaN(Number(v)) &&
    !["color", "fontFamily", "fontWeight"].includes(prop) &&
    !prop.endsWith("Color")
  ) {
    v = Number(v);
  }
  return v;
}

function applyResolvedEntry(resolved, entry, rootVars) {
  if (!entry) return;

  const localVars = {};
  if (entry._static) {
    for (const [k, v] of Object.entries(entry._static)) {
      if (k.startsWith("--") && typeof v === "string") {
        localVars[k] = v;
      }
    }
  }

  if (entry._static) {
    for (const [k, v] of Object.entries(entry._static)) {
      if (k.startsWith("--")) continue;
      const val = resolveCssValue(k, v, rootVars, localVars);
      if (val !== undefined && val !== null) {
        resolved[k] = val;
      }
    }
  }

  if (entry._dynamic) {
    for (const [k, v] of Object.entries(entry._dynamic)) {
      if (k.startsWith("--")) continue;
      const val = resolveCssValue(k, v, rootVars, localVars);
      if (val !== undefined && val !== null) {
        resolved[k] = val;
      }
    }
  }

  if (!entry._static && !entry._dynamic) {
    for (const [k, v] of Object.entries(entry)) {
      if (k.startsWith("--")) continue;
      const val = resolveCssValue(k, v, rootVars, localVars);
      if (val !== undefined && val !== null) {
        resolved[k] = val;
      }
    }
  }
}

// ============================================================================
// Main Native Rust Stylesheet Transform
// ============================================================================
function transformStyles(stylesheet, classNames) {
  if (!stylesheet || !classNames) return undefined;
  if (stylesheet.default && typeof stylesheet.default === "object" && !stylesheet[":root"]) {
    stylesheet = stylesheet.default;
  }

  const rootVars = stylesheet[":root"] || {};
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

  const os = Platform?.OS || "ios";

  for (let cls of classes) {
    if (!cls) continue;

    // Platform variants: ios:, android:, web:
    if (cls.startsWith("ios:")) {
      if (os !== "ios") continue;
      cls = cls.slice(4);
    } else if (cls.startsWith("android:")) {
      if (os !== "android") continue;
      cls = cls.slice(8);
    } else if (cls.startsWith("web:")) {
      if (os !== "web") continue;
      cls = cls.slice(4);
    }

    // Media query variants: sm:, md:, lg:, xl:, 2xl:
    if (cls.startsWith("sm:")) {
      if (width < 640) continue;
      cls = cls.slice(3);
    } else if (cls.startsWith("md:")) {
      if (width < 768) continue;
      cls = cls.slice(3);
    } else if (cls.startsWith("lg:")) {
      if (width < 1024) continue;
      cls = cls.slice(3);
    } else if (cls.startsWith("xl:")) {
      if (width < 1280) continue;
      cls = cls.slice(3);
    } else if (cls.startsWith("2xl:")) {
      if (width < 1536) continue;
      cls = cls.slice(4);
    }

    // Dark / Light variants
    if (cls.startsWith("dark:")) {
      if (colorScheme !== "dark") continue;
      cls = cls.slice(5);
    } else if (cls.startsWith("light:")) {
      if (colorScheme !== "light") continue;
      cls = cls.slice(6);
    }

    const entry = stylesheet[cls];
    if (!entry) continue;

    applyResolvedEntry(resolved, entry, rootVars);
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

  const flat = Array.isArray(declarations) ? getFlattenStyle(declarations) : declarations;
  if (!flat || typeof flat !== "object") return undefined;

  const inheritDeclarations = {};
  for (const key of INHERIT_PROPERTIES) {
    if (flat[key] !== undefined) {
      inheritDeclarations[key] = flat[key];
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
    const flatStatic = Array.isArray(staticStyles) ? getFlattenStyle(staticStyles) : staticStyles;
    if (flatStatic && typeof flatStatic === "object") {
      for (const key in flatStatic) {
        if (!key.startsWith("--")) {
          result[key] = flatStatic[key];
        }
      }
    }
  }
  if (inlineStyle) {
    const flatInline = Array.isArray(inlineStyle) ? getFlattenStyle(inlineStyle) : inlineStyle;
    if (flatInline && typeof flatInline === "object") {
      Object.assign(result, flatInline);
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

export default {
  getFlattenStyle,
  getStyle,
  getInheritStyle,
  mergeStyles,
  clearCache,
};
