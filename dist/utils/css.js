"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.preprocessTailwindCss = preprocessTailwindCss;
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function flattenLayersAndSupports(cssStr) {
  var result = "";
  var i = 0;
  var len = cssStr.length;
  while (i < len) {
    // Skip comments
    if (cssStr[i] === "/" && cssStr[i + 1] === "*") {
      var commentEnd = cssStr.indexOf("*/", i + 2);
      if (commentEnd === -1) {
        result += cssStr.substring(i);
        break;
      }
      result += cssStr.substring(i, commentEnd + 2);
      i = commentEnd + 2;
      continue;
    }

    // Skip strings
    if (cssStr[i] === '"' || cssStr[i] === "'") {
      var _char = cssStr[i];
      var strEnd = i + 1;
      while (strEnd < len) {
        if (cssStr[strEnd] === "\\") {
          strEnd += 2;
        } else if (cssStr[strEnd] === _char) {
          strEnd++;
          break;
        } else {
          strEnd++;
        }
      }
      result += cssStr.substring(i, strEnd);
      i = strEnd;
      continue;
    }

    // Check for @layer or @supports
    if (cssStr[i] === "@") {
      var remaining = cssStr.substring(i);
      var layerMatch = remaining.match(/^@layer\s+[^{]+\{/i);
      var supportsMatch = remaining.match(/^@supports\s+[^{]+\{/i);
      if (layerMatch || supportsMatch) {
        var match = layerMatch || supportsMatch;
        var matchStr = match[0];
        var braceCount = 1;
        var j = i + matchStr.length;
        var innerContent = "";
        while (j < len && braceCount > 0) {
          if (cssStr[j] === "/" && cssStr[j + 1] === "*") {
            var _commentEnd = cssStr.indexOf("*/", j + 2);
            if (_commentEnd === -1) {
              innerContent += cssStr.substring(j);
              j = len;
              break;
            }
            innerContent += cssStr.substring(j, _commentEnd + 2);
            j = _commentEnd + 2;
            continue;
          }
          if (cssStr[j] === '"' || cssStr[j] === "'") {
            var _char2 = cssStr[j];
            var _strEnd = j + 1;
            while (_strEnd < len) {
              if (cssStr[_strEnd] === "\\") {
                _strEnd += 2;
              } else if (cssStr[_strEnd] === _char2) {
                _strEnd++;
                break;
              } else {
                _strEnd++;
              }
            }
            innerContent += cssStr.substring(j, _strEnd);
            j = _strEnd;
            continue;
          }
          if (cssStr[j] === "{") {
            braceCount++;
          } else if (cssStr[j] === "}") {
            braceCount--;
          }
          if (braceCount > 0) {
            innerContent += cssStr[j];
          }
          j++;
        }
        var flattenedInner = flattenLayersAndSupports(innerContent);
        result += flattenedInner;
        i = j;
        continue;
      }
    }
    result += cssStr[i];
    i++;
  }
  return result;
}
function convertRangeMediaQueries(cssStr) {
  var result = cssStr.replace(/\(\s*width\s*>=\s*([^)]+)\)/gi, "(min-width: $1)");
  result = result.replace(/\(\s*width\s*>\s*([^)]+)\)/gi, "(min-width: $1)");
  result = result.replace(/\(\s*width\s*<=\s*([^)]+)\)/gi, "(max-width: $1)");
  result = result.replace(/\(\s*width\s*<\s*([^)]+)\)/gi, "(max-width: $1)");
  return result;
}
function simplifyDoubleSelectors(cssStr) {
  return cssStr.replace(/(\.[a-z0-9_\\\-:]+)\1/gi, "$1");
}
function linearToSrgb(c) {
  return c > 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c;
}
function oklchToRgb(l, c, h) {
  var hRad = h * Math.PI / 180;
  var a = c * Math.cos(hRad);
  var b = c * Math.sin(hRad);
  var l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  var m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  var s_ = l - 0.0894841775 * a - 1.291485548 * b;
  var l3 = l_ * l_ * l_;
  var m3 = m_ * m_ * m_;
  var s3 = s_ * s_ * s_;
  var r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  var g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  var b_rgb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
  r = linearToSrgb(r);
  g = linearToSrgb(g);
  b_rgb = linearToSrgb(b_rgb);
  r = Math.max(0, Math.min(255, Math.round(r * 255)));
  g = Math.max(0, Math.min(255, Math.round(g * 255)));
  b_rgb = Math.max(0, Math.min(255, Math.round(b_rgb * 255)));
  return {
    r: r,
    g: g,
    b: b_rgb
  };
}
function convertOklchToRgbOrHex(cssStr) {
  var oklchRegex = /oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/gi;
  return cssStr.replace(oklchRegex, function (match, lStr, cStr, hStr, aStr) {
    var l = parseFloat(lStr);
    if (lStr.includes("%")) {
      l = l / 100;
    }
    var c = parseFloat(cStr);
    var h = parseFloat(hStr);
    var _oklchToRgb = oklchToRgb(l, c, h),
      r = _oklchToRgb.r,
      g = _oklchToRgb.g,
      b = _oklchToRgb.b;
    if (aStr) {
      var a = parseFloat(aStr);
      if (aStr.includes("%")) {
        a = a / 100;
      }
      return "rgba(".concat(r, ", ").concat(g, ", ").concat(b, ", ").concat(a, ")");
    }
    return "#" + [r, g, b].map(function (x) {
      return x.toString(16).padStart(2, "0");
    }).join("");
  });
}
function removeContainerClass(cssStr) {
  var index = cssStr.indexOf(".container {");
  if (index === -1) return cssStr;
  var braceCount = 1;
  var j = index + ".container {".length;
  while (j < cssStr.length && braceCount > 0) {
    if (cssStr[j] === "{") {
      braceCount++;
    } else if (cssStr[j] === "}") {
      braceCount--;
    }
    j++;
  }
  return cssStr.substring(0, index) + cssStr.substring(j);
}
function extractPropertiesAndInjectToRoot(cssStr) {
  var properties = {};
  var propertyRegex = /@property\s+(--[a-zA-Z0-9_-]+)\s*\{([\s\S]*?)\}/g;
  var match;
  while ((match = propertyRegex.exec(cssStr)) !== null) {
    var name = match[1];
    var body = match[2];
    var valMatch = body.match(/initial-value:\s*([^;]+);/);
    if (valMatch) {
      properties[name] = valMatch[1].trim();
    }
  }
  var rootRegex = /(:root|:root\s*,\s*:host)\s*\{/g;
  var rootMatch = rootRegex.exec(cssStr);
  if (rootMatch) {
    var insertIndex = rootMatch.index + rootMatch[0].length;
    var injectedProps = "\n";
    for (var _i = 0, _Object$entries = Object.entries(properties); _i < _Object$entries.length; _i++) {
      var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
        _name = _Object$entries$_i[0],
        val = _Object$entries$_i[1];
      injectedProps += "    ".concat(_name, ": ").concat(val, ";\n");
    }
    return cssStr.substring(0, insertIndex) + injectedProps + cssStr.substring(insertIndex);
  }
  return cssStr;
}
function preprocessTailwindCss(css) {
  var preprocessedCss = extractPropertiesAndInjectToRoot(css);
  preprocessedCss = flattenLayersAndSupports(preprocessedCss);
  preprocessedCss = removeContainerClass(preprocessedCss);
  preprocessedCss = simplifyDoubleSelectors(preprocessedCss);
  preprocessedCss = convertOklchToRgbOrHex(preprocessedCss);
  preprocessedCss = convertRangeMediaQueries(preprocessedCss);
  return preprocessedCss;
}