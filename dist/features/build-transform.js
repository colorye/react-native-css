"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
exports.expandBorder = expandBorder;
exports.expandFlex = expandFlex;
exports.expandFontWeight = expandFontWeight;
exports.expandLogicalProperty = expandLogicalProperty;
exports.expandSpacing = expandSpacing;
exports.expandTransform = expandTransform;
exports.getAliasedProperty = getAliasedProperty;
exports.hasMediaQuery = hasMediaQuery;
exports.isDynamicValue = isDynamicValue;
exports.isPropertySupported = isPropertySupported;
exports.precomputeDeclaration = precomputeDeclaration;
exports.precomputeValue = precomputeValue;
exports.removeImportant = removeImportant;
exports.removePxUnit = removePxUnit;
exports.transformBorderRadius = transformBorderRadius;
exports.transformColor = transformColor;
exports.transformOpacity = transformOpacity;
exports.transformPosition = transformPosition;
exports.transformRemEm = transformRemEm;
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
/**
 * Build-time CSS transformations
 * Pre-computes static values during Metro transform to reduce runtime work.
 */

// ============================================================================
// Regex patterns (compiled once)
// ============================================================================
var remOrEmUnitRe = /([\d.]+)(rem|em)/g;
var pxUnitRe = /^([\d.]+)px$/;
var viewportUnitRe = /([\d.]+)(vh|vw|vmin|vmax)/;
var cssVarRe = /var\(/;
var calcRe = /calc\(/;
var colorRe1 = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/g;
var colorRe2 = /rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)/g;
var borderRe = /^(\S+)\s+(solid|dashed|dotted)\s+(\S+)$/;
var borderSimpleRe = /^(\S+)\s+(solid|dashed|dotted)$/;
var spacingRe = /^\s*(\S+)(?:\s+(\S+)(?:\s+(\S+)(?:\s+(\S+))?)?)?\s*$/;
var fontWeightRe = /^(normal|bold|[1-9]00)$/;
var transformFnRe = /(perspective|rotate[XYZ]?|scale[XY]?|translate[XY]?|skew[XY]?)\s*\(\s*([^,)]+)(?:,\s*([^)]+))?\)/g;
var UNSUPPORTED_PROPERTIES = ["outline"];

// ============================================================================
// Helpers
// ============================================================================
var itohex = function itohex(component) {
  var hex = Number(component).toString(16);
  return hex.length === 1 ? "0".concat(hex) : hex;
};
var toNumber = function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;
  var trimmed = value.trim();
  if (trimmed === "") return value;
  var num = Number(trimmed);
  return !isNaN(num) ? num : value;
};

// ============================================================================
// Check if value needs runtime processing
// ============================================================================
function isDynamicValue(value) {
  if (typeof value !== "string") return false;
  return viewportUnitRe.test(value) || cssVarRe.test(value);
}
function hasMediaQuery(declaration) {
  if (!declaration || _typeof(declaration) !== "object") return false;
  return Object.keys(declaration).some(function (key) {
    return key.startsWith("@media");
  });
}

// ============================================================================
// Static transformations (can be done at build time)
// ============================================================================

/** Remove !important */
function removeImportant(value) {
  if (typeof value !== "string") return value;
  return value.replace(/\s*!important\s*/g, "").trim();
}

/** Convert rem/em to px (1rem = 16px) */
function transformRemEm(value) {
  if (typeof value !== "string") return value;
  return value.replace(remOrEmUnitRe, function (_, num) {
    return "".concat(parseFloat(num) * 16, "px");
  });
}

/** Remove px unit and convert to number */
function removePxUnit(value) {
  if (typeof value !== "string") return value;
  var match = pxUnitRe.exec(value);
  if (match) return parseFloat(match[1]);
  return value;
}

/** Transform rgba/rgb to hex */
function transformColor(value) {
  if (typeof value !== "string") return value;

  // Reset lastIndex for global regexes
  colorRe1.lastIndex = 0;
  colorRe2.lastIndex = 0;
  value = value.replace(colorRe1, function (_, r, g, b, a) {
    var alpha = parseFloat(a);
    if (isNaN(alpha) || alpha >= 1) return "#".concat(itohex(r)).concat(itohex(g)).concat(itohex(b));
    return "#".concat(itohex(r)).concat(itohex(g)).concat(itohex(b)).concat(itohex(Math.round(alpha * 255)));
  });
  value = value.replace(colorRe2, function (_, r, g, b, a) {
    var alpha = parseFloat(a);
    if (isNaN(alpha) || alpha >= 1) return "#".concat(itohex(r)).concat(itohex(g)).concat(itohex(b));
    return "#".concat(itohex(r)).concat(itohex(g)).concat(itohex(b)).concat(itohex(Math.round(alpha * 255)));
  });
  return value;
}

/** Transform position: fixed → absolute */
function transformPosition(property, value) {
  if (property === "position" && value === "fixed") return "absolute";
  return value;
}

/** Transform border-radius with % → 9999 */
function transformBorderRadius(property, value) {
  if (property.toLowerCase().endsWith("radius") && typeof value === "string" && value.includes("%")) {
    return 9999;
  }
  return value;
}

/** Transform opacity with % → decimal */
function transformOpacity(property, value) {
  if (property === "opacity" && typeof value === "string" && value.endsWith("%")) {
    var num = parseFloat(value);
    if (!isNaN(num)) {
      return num / 100;
    }
  }
  return value;
}

/** Get aliased property name */
function getAliasedProperty(property) {
  if (property === "background") return "backgroundColor";
  return property;
}

/** Check if property is supported */
function isPropertySupported(property, value) {
  if (UNSUPPORTED_PROPERTIES.includes(property)) return false;
  if (value === undefined || value === null) return false;
  if (_typeof(value) === "object") return false; // Skip nested objects (media queries)
  return true;
}

// ============================================================================
// Shorthand expansion
// ============================================================================

/** Expand border shorthand */
function expandBorder(property, value) {
  if (!["border", "borderTop", "borderBottom", "borderLeft", "borderRight"].includes(property)) {
    return null;
  }
  if (value === "none" || value === "0") {
    return _defineProperty({}, "".concat(property, "Width"), 0);
  }

  // Try "width style color" format
  var match = borderRe.exec(String(value));
  if (match) {
    var _match = match,
      _match2 = _slicedToArray(_match, 4),
      width = _match2[1],
      style = _match2[2],
      color = _match2[3];
    return _defineProperty(_defineProperty(_defineProperty({}, "".concat(property, "Width"), toNumber(width)), "".concat(property, "Style"), style), "".concat(property, "Color"), color);
  }

  // Try "width style" format
  match = borderSimpleRe.exec(String(value));
  if (match) {
    var _match3 = match,
      _match4 = _slicedToArray(_match3, 3),
      _width = _match4[1],
      _style = _match4[2];
    return _defineProperty(_defineProperty({}, "".concat(property, "Width"), toNumber(_width)), "".concat(property, "Style"), _style);
  }

  // Single value (width only)
  return _defineProperty({}, "".concat(property, "Width"), toNumber(value));
}
function splitSpacingValues(str) {
  var parts = [];
  var current = "";
  var depth = 0;
  for (var i = 0; i < str.length; i++) {
    var _char = str[i];
    if (_char === "(") {
      depth++;
      current += _char;
    } else if (_char === ")") {
      depth--;
      current += _char;
    } else if (_char === " " && depth === 0) {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += _char;
    }
  }
  if (current) {
    parts.push(current);
  }
  return parts.filter(Boolean);
}

/** Expand margin/padding shorthand */
function expandSpacing(property, value) {
  if (!["padding", "margin"].includes(property)) return null;
  var parts = splitSpacingValues(String(value));
  if (parts.length === 0) return null;
  var top = parts[0];
  var right = parts[1] !== undefined ? parts[1] : top;
  var bottom = parts[2] !== undefined ? parts[2] : top;
  var left = parts[3] !== undefined ? parts[3] : right;
  return _defineProperty(_defineProperty(_defineProperty(_defineProperty({}, "".concat(property, "Top"), toNumber(top)), "".concat(property, "Right"), toNumber(right)), "".concat(property, "Bottom"), toNumber(bottom)), "".concat(property, "Left"), toNumber(left));
}

/** Expand fontWeight */
function expandFontWeight(property, value) {
  if (property !== "fontWeight") return null;
  if (!fontWeightRe.test(String(value))) return null;
  return {
    fontWeight: String(value)
  };
}

/** Expand flex */
function expandFlex(property, value) {
  if (property !== "flex") return null;
  return {
    flex: parseInt(value, 10)
  };
}

/** Expand transform property */
function expandTransform(property, value) {
  if (property !== "transform") return null;
  if (typeof value !== "string") return null;

  // If contains dynamic values, skip
  if (isDynamicValue(value)) return null;
  var transforms = [];
  var match;
  var re = new RegExp(transformFnRe.source, "g");
  while ((match = re.exec(value)) !== null) {
    var _match5 = match,
      _match6 = _slicedToArray(_match5, 4),
      fn = _match6[1],
      val1 = _match6[2],
      val2 = _match6[3];
    if (fn === "translate" || fn === "skew") {
      transforms.push(_defineProperty({}, "".concat(fn, "X"), toNumber(val1)));
      if (val2 !== undefined) {
        transforms.push(_defineProperty({}, "".concat(fn, "Y"), toNumber(val2)));
      }
    } else {
      transforms.push(_defineProperty({}, fn, toNumber(val1)));
    }
  }
  return transforms.length > 0 ? {
    transform: transforms
  } : null;
}

/** Expand logical properties like paddingInline, marginInline, paddingBlock, marginBlock */
function expandLogicalProperty(property, value) {
  if (!["paddingInline", "marginInline", "paddingBlock", "marginBlock", "paddingInlineStart", "paddingInlineEnd", "marginInlineStart", "marginInlineEnd", "insetInline", "insetInlineStart", "insetInlineEnd", "insetBlock", "insetBlockStart", "insetBlockEnd"].includes(property)) {
    return null;
  }
  var strValue = String(value).trim();
  var parts = [];
  var current = "";
  var depth = 0;
  for (var i = 0; i < strValue.length; i++) {
    var _char2 = strValue[i];
    if (_char2 === "(") {
      depth++;
      current += _char2;
    } else if (_char2 === ")") {
      depth--;
      current += _char2;
    } else if (_char2 === " " && depth === 0) {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += _char2;
    }
  }
  if (current) {
    parts.push(current);
  }
  var cleanedParts = parts.filter(Boolean);
  if (property === "paddingInlineStart") return {
    paddingStart: toNumber(value)
  };
  if (property === "paddingInlineEnd") return {
    paddingEnd: toNumber(value)
  };
  if (property === "marginInlineStart") return {
    marginStart: toNumber(value)
  };
  if (property === "marginInlineEnd") return {
    marginEnd: toNumber(value)
  };
  if (property === "insetInlineStart") return {
    start: toNumber(value)
  };
  if (property === "insetInlineEnd") return {
    end: toNumber(value)
  };
  if (property === "insetBlockStart") return {
    top: toNumber(value)
  };
  if (property === "insetBlockEnd") return {
    bottom: toNumber(value)
  };
  if (property === "paddingInline") {
    if (cleanedParts.length === 1) {
      return {
        paddingHorizontal: toNumber(cleanedParts[0])
      };
    }
    if (cleanedParts.length >= 2) {
      return {
        paddingStart: toNumber(cleanedParts[0]),
        paddingEnd: toNumber(cleanedParts[1])
      };
    }
  }
  if (property === "marginInline") {
    if (cleanedParts.length === 1) {
      return {
        marginHorizontal: toNumber(cleanedParts[0])
      };
    }
    if (cleanedParts.length >= 2) {
      return {
        marginStart: toNumber(cleanedParts[0]),
        marginEnd: toNumber(cleanedParts[1])
      };
    }
  }
  if (property === "paddingBlock") {
    if (cleanedParts.length === 1) {
      return {
        paddingVertical: toNumber(cleanedParts[0])
      };
    }
    if (cleanedParts.length >= 2) {
      return {
        paddingTop: toNumber(cleanedParts[0]),
        paddingBottom: toNumber(cleanedParts[1])
      };
    }
  }
  if (property === "marginBlock") {
    if (cleanedParts.length === 1) {
      return {
        marginVertical: toNumber(cleanedParts[0])
      };
    }
    if (cleanedParts.length >= 2) {
      return {
        marginTop: toNumber(cleanedParts[0]),
        marginBottom: toNumber(cleanedParts[1])
      };
    }
  }
  if (property === "insetInline") {
    if (cleanedParts.length === 1) {
      return {
        left: toNumber(cleanedParts[0]),
        right: toNumber(cleanedParts[0])
      };
    }
    if (cleanedParts.length >= 2) {
      return {
        start: toNumber(cleanedParts[0]),
        end: toNumber(cleanedParts[1])
      };
    }
  }
  if (property === "insetBlock") {
    if (cleanedParts.length === 1) {
      return {
        top: toNumber(cleanedParts[0]),
        bottom: toNumber(cleanedParts[0])
      };
    }
    if (cleanedParts.length >= 2) {
      return {
        top: toNumber(cleanedParts[0]),
        bottom: toNumber(cleanedParts[1])
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
function precomputeValue(property, value) {
  // Handle non-string values
  if (typeof value !== "string") {
    return {
      property: property,
      value: value,
      isDynamic: false
    };
  }

  // Check if dynamic (needs runtime)
  var isDynamic = isDynamicValue(value) || calcRe.test(value);

  // Apply static transformations (even for dynamic values, some parts can be pre-processed)
  var processed = value;
  processed = removeImportant(processed);
  processed = transformRemEm(processed);
  processed = transformColor(processed);
  processed = transformPosition(property, processed);
  processed = transformBorderRadius(property, processed);
  processed = transformOpacity(property, processed);

  // Get aliased property
  var aliasedProp = getAliasedProperty(property);

  // For static values, remove px and convert to number
  if (!isDynamic) {
    processed = removePxUnit(processed);
    if (typeof processed === "string") {
      processed = toNumber(processed);
    }
  }
  return {
    property: aliasedProp,
    value: processed,
    isDynamic: isDynamic
  };
}

/**
 * Pre-compute an entire declaration object
 * Returns { _static: {...}, _dynamic: {...}, _hasDynamic: boolean }
 */
function precomputeDeclaration(declaration) {
  if (!declaration || _typeof(declaration) !== "object") {
    return {
      _static: {},
      _dynamic: {},
      _hasDynamic: false
    };
  }
  var staticProps = {};
  var dynamicProps = {};
  var hasDynamic = false;
  for (var _i = 0, _Object$entries = Object.entries(declaration); _i < _Object$entries.length; _i++) {
    var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
      property = _Object$entries$_i[0],
      value = _Object$entries$_i[1];
    // Handle media queries - always dynamic (needs runtime evaluation)
    if (property.startsWith("@media")) {
      // Recursively pre-compute media query content
      var mediaResult = precomputeDeclaration(value);
      dynamicProps[property] = {
        _static: mediaResult._static,
        _dynamic: mediaResult._dynamic
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
    var _precomputeValue = precomputeValue(property, value),
      prop = _precomputeValue.property,
      val = _precomputeValue.value,
      isDynamic = _precomputeValue.isDynamic;

    // Try to expand shorthand
    var expanded = expandBorder(prop, val) || expandSpacing(prop, val) || expandFontWeight(prop, val) || expandFlex(prop, val) || expandTransform(prop, val) || expandLogicalProperty(prop, val);
    if (expanded) {
      // Add expanded properties
      for (var _i2 = 0, _Object$entries2 = Object.entries(expanded); _i2 < _Object$entries2.length; _i2++) {
        var _Object$entries2$_i = _slicedToArray(_Object$entries2[_i2], 2),
          expProp = _Object$entries2$_i[0],
          expVal = _Object$entries2$_i[1];
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
  return {
    _static: staticProps,
    _dynamic: dynamicProps,
    _hasDynamic: hasDynamic
  };
}
var _default = exports["default"] = {
  isDynamicValue: isDynamicValue,
  hasMediaQuery: hasMediaQuery,
  precomputeValue: precomputeValue,
  precomputeDeclaration: precomputeDeclaration
};