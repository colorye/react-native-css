"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseStylesheetWithLightning = parseStylesheetWithLightning;
var _lightningcss = require("lightningcss");
var _helper = require("./helper");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
/**
 * Unwrap @layer and @supports blocks to expose standard CSS rules
 */
function flattenBlocks(cssStr) {
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

    // Check for at-rules
    if (cssStr[i] === "@") {
      var remaining = cssStr.substring(i);
      var layerMatch = remaining.match(/^@(layer|supports|property)[^{]*\{/i);
      if (layerMatch) {
        var layerType = layerMatch[1].toLowerCase();
        // Skip @layer base entirely because React Native views should not inherit browser base resets (* { border: 0 solid; margin: 0 })
        var isLayerBase = /^@layer\s+base\s*\{/i.test(layerMatch[0]);
        if (layerType === "property" || isLayerBase) {
          var _braceCount = 1;
          var _j = i + layerMatch[0].length;
          while (_j < len && _braceCount > 0) {
            if (cssStr[_j] === "{") _braceCount++;else if (cssStr[_j] === "}") _braceCount--;
            _j++;
          }
          i = _j;
          continue;
        }
        var braceCount = 1;
        var j = i + layerMatch[0].length;
        var innerContent = "";
        while (j < len && braceCount > 0) {
          if (cssStr[j] === "{") braceCount++;else if (cssStr[j] === "}") braceCount--;
          if (braceCount > 0) innerContent += cssStr[j];
          j++;
        }
        result += flattenBlocks(innerContent);
        i = j;
        continue;
      }
    }
    result += cssStr[i];
    i++;
  }
  return result;
}

/**
 * Parse and lower modern CSS using LightningCSS (Rust-based engine)
 * Handles OKLCH, color-mix, CSS nesting, @layer, and @media range queries
 */
function parseStylesheetWithLightning(rawCss) {
  var transformed = (0, _lightningcss.transform)({
    filename: "input.css",
    code: Buffer.from(rawCss),
    targets: {
      safari: 14 << 16
    },
    minify: false
  });
  var cssText = flattenBlocks(transformed.code.toString());
  var rawStylesheet = {};
  var cleanSelector = function cleanSelector(sel) {
    if (sel.includes(":root")) return [":root"];
    var s = sel.trim();
    if (!s.startsWith(".")) return [];

    // Strip leading dot
    s = s.slice(1);

    // Extract class name (handling escaped chars like active\:scale-95, w-\[48\%\], etc.)
    var classPart = "";
    var i = 0;
    while (i < s.length) {
      if (s[i] === "\\") {
        if (i + 1 < s.length) {
          classPart += s[i + 1];
          i += 2;
          continue;
        }
      }
      if (s[i] === ":" || s[i] === " " || s[i] === ">" || s[i] === "~" || s[i] === "+") {
        break;
      }
      classPart += s[i];
      i++;
    }
    if (!classPart) return [];
    var names = [classPart];

    // For variants like disabled:bg-navy-300 or active:opacity-80, also register the base class name
    if (classPart.startsWith("disabled:") || classPart.startsWith("active:") || classPart.startsWith("pressed:")) {
      var base = classPart.replace(/^(disabled|active|pressed):/, "");
      if (base && !names.includes(base)) {
        names.push(base);
      }
    }
    return names;
  };
  var parseDeclarations = function parseDeclarations(bodyText) {
    var decls = {};
    var parts = bodyText.split(";");
    var _iterator = _createForOfIteratorHelper(parts),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var part = _step.value;
        var trimmed = part.trim();
        if (!trimmed) continue;
        var colonIdx = trimmed.indexOf(":");
        if (colonIdx === -1) continue;
        var prop = trimmed.slice(0, colonIdx).trim();
        var val = trimmed.slice(colonIdx + 1).trim();
        if (!prop || !val) continue;
        if (prop.startsWith("--")) {
          decls[prop] = val;
        } else {
          decls[(0, _helper.camelize)(prop)] = val;
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
    return decls;
  };

  // 1. Separate media query blocks
  var mediaBlocks = [];
  var noMediaCss = cssText.replace(/@media\s*([^{]+)\{([\s\S]+?\}\s*)\}/g, function (_, query, inner) {
    mediaBlocks.push({
      query: query.trim(),
      inner: inner
    });
    return "";
  });

  // 2. Parse regular rules
  var ruleRe = /([^{}]+)\{([^{}]+)\}/g;
  var match;
  while ((match = ruleRe.exec(noMediaCss)) !== null) {
    var rawSelectors = match[1].trim();
    var body = match[2].trim();
    if (rawSelectors.startsWith("@")) continue;
    var selectors = rawSelectors.split(",").map(function (s) {
      return s.trim();
    });
    var decls = parseDeclarations(body);
    var _iterator2 = _createForOfIteratorHelper(selectors),
      _step2;
    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var sel = _step2.value;
        if (!sel.startsWith(".") && !sel.includes(":root")) continue;
        var names = cleanSelector(sel);
        var _iterator3 = _createForOfIteratorHelper(names),
          _step3;
        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var name = _step3.value;
            rawStylesheet[name] = _objectSpread(_objectSpread({}, rawStylesheet[name]), decls);
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
  }

  // 3. Parse media query rules
  for (var _i = 0, _mediaBlocks = mediaBlocks; _i < _mediaBlocks.length; _i++) {
    var mb = _mediaBlocks[_i];
    var mMatch = void 0;
    var mRuleRe = /([^{}]+)\{([^{}]+)\}/g;
    while ((mMatch = mRuleRe.exec(mb.inner)) !== null) {
      var _rawSelectors = mMatch[1].trim();
      var _body = mMatch[2].trim();
      var _selectors = _rawSelectors.split(",").map(function (s) {
        return s.trim();
      });
      var _decls = parseDeclarations(_body);
      var _iterator4 = _createForOfIteratorHelper(_selectors),
        _step4;
      try {
        for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
          var _sel = _step4.value;
          if (!_sel.startsWith(".") && !_sel.includes(":root")) continue;
          var _names = cleanSelector(_sel);
          var _iterator5 = _createForOfIteratorHelper(_names),
            _step5;
          try {
            for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
              var _name = _step5.value;
              rawStylesheet[_name] = _objectSpread(_objectSpread({}, rawStylesheet[_name]), {}, _defineProperty({}, "@media ".concat(mb.query), _decls));
            }
          } catch (err) {
            _iterator5.e(err);
          } finally {
            _iterator5.f();
          }
        }
      } catch (err) {
        _iterator4.e(err);
      } finally {
        _iterator4.f();
      }
    }
  }
  return rawStylesheet;
}