import { Appearance, Dimensions, PixelRatio } from "react-native";
import CssCalc from "./features/css-calc";
import CssMedia from "./features/css-media";
import CssTransform from "./features/css-transform";
import CssVars from "./features/css-vars";

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
// Singleton Helper Instances
// ============================================================================
const vars = new CssVars();
const transform = new CssTransform();
const calc = new CssCalc();
const media = new CssMedia();

// ============================================================================
// Cached Dimensions and Appearance
// ============================================================================
let cachedDimensions = null;
let cachedColorScheme = null;
let TRANSFORM_CACHE = {};
let currentCacheKey = null;

function getDimensions() {
  if (!cachedDimensions) {
    cachedDimensions = Dimensions.get("window");
  }
  return cachedDimensions;
}

function getColorScheme() {
  if (cachedColorScheme === null) {
    cachedColorScheme = Appearance.getColorScheme();
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

// Event listeners for cache invalidation
Dimensions.addEventListener("change", invalidateCache);
Appearance.addChangeListener(invalidateCache);

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

  return Object.keys(result).length > 0 ? result : undefined;
}

// ============================================================================
// Main Transform Function
// ============================================================================
function transformStyles(stylesheet, classNames) {
  if (!stylesheet || !classNames) return undefined;

  const { width, height } = getDimensions();
  const colorScheme = getColorScheme();

  // Check cache validity
  const cacheKey = getCacheKey();
  if (cacheKey !== currentCacheKey) {
    TRANSFORM_CACHE = {};
    currentCacheKey = cacheKey;
  }

  const transformedDeclarations = classNames.split(" ").map((className) => {
    if (!className) return null;

    // Check cache
    if (TRANSFORM_CACHE[className] !== undefined) {
      return TRANSFORM_CACHE[className];
    }

    const declaration = stylesheet[className];
    const globalDeclaration = stylesheet[":root"];

    if (!declaration && !globalDeclaration) {
      TRANSFORM_CACHE[className] = null;
      return null;
    }

    // Reset vars helper
    vars.global = {};
    vars.data = {};

    if (globalDeclaration) {
      // Handle global with potential _static/_dynamic format
      const globalRaw = globalDeclaration._static
        ? { ...globalDeclaration._static, ...globalDeclaration._dynamic }
        : globalDeclaration;
      vars.setGlobal(globalRaw, { width, height });
    }

    if (declaration) {
      // Handle declaration with potential _static/_dynamic format
      const declRaw = declaration._static
        ? { ...declaration._static, ...declaration._dynamic }
        : declaration;
      vars.set(className, declRaw, { width, height });
    }

    // Get static and dynamic parts
    const staticPart = declaration?._static || {};
    const dynamicPart = declaration?._dynamic || (declaration?._static ? {} : declaration) || {};

    // Start with pre-computed static styles
    let results = { ...staticPart };

    // Process dynamic properties
    const transformDynamic = (currentSelector, decl) => {
      for (let property in decl) {
        if (vars.isVar(property)) continue;

        let value = decl[property];

        // Handle media queries
        const [isMedia, matchedMedia] = media.match(property, { width, height, colorScheme });
        if (isMedia) {
          if (matchedMedia) {
            vars.set(property, value);
            // Media query value might have _static/_dynamic too
            const mediaStatic = value?._static || {};
            const mediaDynamic = value?._dynamic || (value?._static ? {} : value) || {};
            Object.assign(results, mediaStatic);
            transformDynamic(property, mediaDynamic);
          }
          continue;
        }

        // Transform the value
        [property, value] = transform.transformUnsafeValue(property, value);
        if (!property) continue;

        value = vars.injectVar(currentSelector, value);
        value = transform.transformUnsupportedUnit(value);
        value = transform.transformViewportUnit(value, { width, height });
        value = transform.removeUnit(value);
        value = calc.calc(value);
        value = calc.calcColor(value);
        value = transform.transformFontScaling(property, value, {
          width,
          height,
          roundFn: PixelRatio.roundToNearestPixel,
        });

        if (value === undefined) continue;

        const transformed = transform.transform(property, value, { width, height });
        if (transformed) {
          Object.assign(results, transformed);
        }
      }
    };

    transformDynamic(className, dynamicPart);

    TRANSFORM_CACHE[className] = results;
    return results;
  });

  return getFlattenStyle(transformedDeclarations);
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
  return getFlattenStyle([
    getInheritStyle(getFlattenStyle(inheritStyle)),
    transformStyles(stylesheet, className),
    style,
  ]);
}

// ============================================================================
// Lightweight Merge for Static Styles
// ============================================================================

/**
 * Lightweight merge function for static styles with inheritStyle
 * Much cheaper than full getStyle() - just extracts inherited props and merges
 */
function mergeStyles(inheritStyle, staticStyles, inlineStyle) {
  // Fast path: no inheritStyle
  if (!inheritStyle && !inlineStyle) {
    return staticStyles;
  }

  // Extract inherited properties from inheritStyle
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

  // Merge: inheritStyle (lowest) -> staticStyles -> inlineStyle (highest)
  if (!inherited && !inlineStyle) {
    return staticStyles;
  }

  const result = {};
  if (inherited) Object.assign(result, inherited);
  if (staticStyles) Object.assign(result, staticStyles);
  if (inlineStyle) Object.assign(result, inlineStyle);

  return Object.keys(result).length > 0 ? result : undefined;
}

export default {
  getStyle,
  getInheritStyle,
  mergeStyles,
};
