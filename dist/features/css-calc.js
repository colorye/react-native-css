"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = CssCalc;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var calcRe = /calc\(([^)]+)\)/g;
var colorRe1 = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+)\s*)?\)/g;
var colorRe2 = /rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)/g;
var itohex = function itohex(component) {
  var hex = Number(component).toString(16);
  return hex.length === 1 ? "0".concat(hex) : hex;
};
function splitTopLevelCommas(str) {
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
    } else if (_char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += _char;
    }
  }
  if (current) {
    parts.push(current.trim());
  }
  return parts;
}
function parseColorMixArg(arg) {
  arg = arg.trim();
  // Check if there is a percentage at the end
  var percentEndMatch = arg.match(/\s+([\d.]+)%$/i);
  if (percentEndMatch) {
    var percentage = parseFloat(percentEndMatch[1]);
    var colorStr = arg.substring(0, arg.length - percentEndMatch[0].length).trim();
    return {
      colorStr: colorStr,
      percentage: percentage
    };
  }

  // Check if there is a percentage at the beginning
  var percentStartMatch = arg.match(/^([\d.]+)%\s+/i);
  if (percentStartMatch) {
    var _percentage = parseFloat(percentStartMatch[1]);
    var _colorStr = arg.substring(percentStartMatch[0].length).trim();
    return {
      colorStr: _colorStr,
      percentage: _percentage
    };
  }
  return {
    colorStr: arg,
    percentage: null
  };
}
function hslToRgb(h, s, l) {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  var r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    var hue2rgb = function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}
function parseColor(colorStr) {
  if (!colorStr) return null;
  colorStr = colorStr.trim().toLowerCase();
  if (colorStr === "transparent") {
    return {
      r: 0,
      g: 0,
      b: 0,
      a: 0
    };
  }

  // Hex
  if (colorStr.startsWith("#")) {
    var hex = colorStr.substring(1);
    if (hex.length === 3 || hex.length === 4) {
      var r = parseInt(hex[0] + hex[0], 16);
      var g = parseInt(hex[1] + hex[1], 16);
      var b = parseInt(hex[2] + hex[2], 16);
      var a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      return {
        r: r,
        g: g,
        b: b,
        a: a
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      var _r = parseInt(hex.substring(0, 2), 16);
      var _g = parseInt(hex.substring(2, 4), 16);
      var _b = parseInt(hex.substring(4, 6), 16);
      var _a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;
      return {
        r: _r,
        g: _g,
        b: _b,
        a: _a
      };
    }
    return null;
  }

  // rgb / rgba
  var rgbMatch = colorStr.match(/rgba?\(\s*([\d.]+)(%?)\s*[\s,]\s*([\d.]+)(%?)\s*[\s,]\s*([\d.]+)(%?)(?:\s*[\s,/]\s*([\d.]+)(%?))?\s*\)/);
  if (rgbMatch) {
    var _r2 = parseFloat(rgbMatch[1]);
    if (rgbMatch[2] === "%") _r2 = _r2 / 100 * 255;
    var _g2 = parseFloat(rgbMatch[3]);
    if (rgbMatch[4] === "%") _g2 = _g2 / 100 * 255;
    var _b2 = parseFloat(rgbMatch[5]);
    if (rgbMatch[6] === "%") _b2 = _b2 / 100 * 255;
    var _a2 = 1;
    if (rgbMatch[7] !== undefined) {
      _a2 = parseFloat(rgbMatch[7]);
      if (rgbMatch[8] === "%") _a2 = _a2 / 100;
    }
    return {
      r: Math.round(_r2),
      g: Math.round(_g2),
      b: Math.round(_b2),
      a: _a2
    };
  }

  // hsl / hsla
  var hslMatch = colorStr.match(/hsla?\(\s*([\d.]+)(?:deg)?\s*[\s,]\s*([\d.]+)%\s*[\s,]\s*([\d.]+)%\s*(?:\s*[\s,/]\s*([\d.]+)(%?))?\s*\)/);
  if (hslMatch) {
    var h = parseFloat(hslMatch[1]);
    var s = parseFloat(hslMatch[2]);
    var l = parseFloat(hslMatch[3]);
    var _a3 = 1;
    if (hslMatch[4] !== undefined) {
      _a3 = parseFloat(hslMatch[4]);
      if (hslMatch[5] === "%") _a3 = _a3 / 100;
    }
    var rgb = hslToRgb(h, s, l);
    return _objectSpread(_objectSpread({}, rgb), {}, {
      a: _a3
    });
  }

  // Basic named colors fallback
  var basicColors = {
    white: {
      r: 255,
      g: 255,
      b: 255,
      a: 1
    },
    black: {
      r: 0,
      g: 0,
      b: 0,
      a: 1
    },
    red: {
      r: 255,
      g: 0,
      b: 0,
      a: 1
    },
    green: {
      r: 0,
      g: 128,
      b: 0,
      a: 1
    },
    blue: {
      r: 0,
      g: 0,
      b: 255,
      a: 1
    },
    yellow: {
      r: 255,
      g: 255,
      b: 0,
      a: 1
    },
    magenta: {
      r: 255,
      g: 0,
      b: 255,
      a: 1
    },
    cyan: {
      r: 0,
      g: 255,
      b: 255,
      a: 1
    }
  };
  if (basicColors[colorStr]) {
    return basicColors[colorStr];
  }
  return null;
}
function resolveColorMix(value) {
  if (typeof value !== "string") return value;
  var index;
  while ((index = value.toLowerCase().indexOf("color-mix(")) !== -1) {
    // Find matching closing parenthesis
    var depth = 1;
    var j = index + "color-mix(".length;
    while (j < value.length && depth > 0) {
      if (value[j] === "(") {
        depth++;
      } else if (value[j] === ")") {
        depth--;
      }
      j++;
    }
    if (depth > 0) {
      // Unmatched parenthesis, break to avoid infinite loop
      break;
    }
    var innerContent = value.substring(index + "color-mix(".length, j - 1);

    // Parse innerContent: "in <color-space>, <args>"
    var commaIndex = innerContent.indexOf(",");
    if (commaIndex === -1) {
      // Invalid syntax, skip this one by replacing "color-mix(" with a placeholder temporarily
      value = value.substring(0, index) + "COLOR_MIX_TEMP(" + value.substring(index + "color-mix(".length);
      continue;
    }
    var argsPart = innerContent.substring(commaIndex + 1).trim();

    // Check if argsPart contains another color-mix. If so, resolve the inner one first.
    if (argsPart.toLowerCase().includes("color-mix(")) {
      var resolvedArgsPart = resolveColorMix(argsPart);
      value = value.substring(0, index + "color-mix(".length + commaIndex + 1) + " " + resolvedArgsPart + value.substring(j - 1);
      continue;
    }

    // Now we can resolve this color-mix
    var args = splitTopLevelCommas(argsPart);
    if (args.length !== 2) {
      // Invalid syntax
      value = value.substring(0, index) + "COLOR_MIX_TEMP(" + value.substring(index + "color-mix(".length);
      continue;
    }
    var arg1 = parseColorMixArg(args[0]);
    var arg2 = parseColorMixArg(args[1]);
    var c1 = parseColor(arg1.colorStr);
    var c2 = parseColor(arg2.colorStr);
    if (!c1 || !c2) {
      // Parsing failed, skip
      value = value.substring(0, index) + "COLOR_MIX_TEMP(" + value.substring(index + "color-mix(".length);
      continue;
    }
    var p1 = arg1.percentage;
    var p2 = arg2.percentage;
    var w1 = void 0,
      w2 = void 0;
    if (p1 !== null && p2 !== null) {
      var sum = p1 + p2;
      if (sum > 100) {
        w1 = p1 / sum * 100;
        w2 = p2 / sum * 100;
      } else {
        w1 = p1;
        w2 = p2;
      }
    } else if (p1 !== null) {
      w1 = p1;
      w2 = 100 - p1;
    } else if (p2 !== null) {
      w2 = p2;
      w1 = 100 - p2;
    } else {
      w1 = 50;
      w2 = 50;
    }
    var a1 = c1.a;
    var a2 = c2.a;
    var totalWeight = w1 + w2;
    var resolvedColor = void 0;
    if (totalWeight === 0) {
      resolvedColor = "transparent";
    } else {
      var f1 = w1 / totalWeight;
      var f2 = w2 / totalWeight;
      var mixedA = a1 * f1 + a2 * f2;
      var mixedR = void 0,
        mixedG = void 0,
        mixedB = void 0;
      if (mixedA === 0) {
        mixedR = 0;
        mixedG = 0;
        mixedB = 0;
      } else {
        mixedR = Math.round((c1.r * a1 * f1 + c2.r * a2 * f2) / mixedA);
        mixedG = Math.round((c1.g * a1 * f1 + c2.g * a2 * f2) / mixedA);
        mixedB = Math.round((c1.b * a1 * f1 + c2.b * a2 * f2) / mixedA);
      }
      var finalA = totalWeight < 100 ? mixedA * (totalWeight / 100) : mixedA;
      var roundedA = Math.round(finalA * 10000) / 10000;
      resolvedColor = "rgba(".concat(mixedR, ", ").concat(mixedG, ", ").concat(mixedB, ", ").concat(roundedA, ")");
    }
    value = value.substring(0, index) + resolvedColor + value.substring(j);
  }

  // Restore placeholders
  value = value.replace(/COLOR_MIX_TEMP\(/gi, "color-mix(");
  return value;
}
function CssCalc() {
  this.calc = function (value) {
    if (value === undefined || typeof value !== "string") return value;
    return value.replace(calcRe, function (_, calc) {
      try {
        // eslint-disable-next-line
        var calcFunc = new Function("return ".concat(calc));
        var calcValue = calcFunc();
        return calcValue;
      } catch (_unused) {
        return 0;
      }
    });
  };
  this.calcColor = function (value) {
    if (value === undefined || typeof value !== "string") return value;
    value = resolveColorMix(value);
    value = value.replace(colorRe1, function (_, r, g, b, a) {
      a = parseFloat(a);
      if (isNaN(a) || a >= 1) return "#".concat(itohex(r)).concat(itohex(g)).concat(itohex(b));
      a = Math.round(a * 255);
      return "#".concat(itohex(r)).concat(itohex(g)).concat(itohex(b)).concat(itohex(a));
    });
    value = value.replace(colorRe2, function (_, r, g, b, a) {
      a = parseFloat(a);
      if (isNaN(a) || a >= 1) return "#".concat(itohex(r)).concat(itohex(g)).concat(itohex(b));
      a = Math.round(a * 255);
      return "#".concat(itohex(r)).concat(itohex(g)).concat(itohex(b)).concat(itohex(a));
    });
    return value;
  };
  return this;
}