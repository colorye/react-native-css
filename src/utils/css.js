import { transform } from "lightningcss";
import { camelize } from "./helper";

/**
 * Unwrap @layer and @supports blocks to expose standard CSS rules
 */
function flattenBlocks(cssStr) {
  let result = "";
  let i = 0;
  const len = cssStr.length;

  while (i < len) {
    // Skip comments
    if (cssStr[i] === "/" && cssStr[i + 1] === "*") {
      const commentEnd = cssStr.indexOf("*/", i + 2);
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
      const char = cssStr[i];
      let strEnd = i + 1;
      while (strEnd < len) {
        if (cssStr[strEnd] === "\\") {
          strEnd += 2;
        } else if (cssStr[strEnd] === char) {
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
      const remaining = cssStr.substring(i);
      const layerMatch = remaining.match(/^@(layer|supports|property)[^{]*\{/i);
      if (layerMatch) {
        const layerType = layerMatch[1].toLowerCase();
        // Skip @layer base entirely because React Native views should not inherit browser base resets (* { border: 0 solid; margin: 0 })
        const isLayerBase = /^@layer\s+base\s*\{/i.test(layerMatch[0]);
        if (layerType === "property" || isLayerBase) {
          let braceCount = 1;
          let j = i + layerMatch[0].length;
          while (j < len && braceCount > 0) {
            if (cssStr[j] === "{") braceCount++;
            else if (cssStr[j] === "}") braceCount--;
            j++;
          }
          i = j;
          continue;
        }

        let braceCount = 1;
        let j = i + layerMatch[0].length;
        let innerContent = "";
        while (j < len && braceCount > 0) {
          if (cssStr[j] === "{") braceCount++;
          else if (cssStr[j] === "}") braceCount--;
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
export function parseStylesheetWithLightning(rawCss) {
  const transformed = transform({
    filename: "input.css",
    code: Buffer.from(rawCss),
    targets: {
      safari: 14 << 16,
    },
    minify: false,
  });

  const cssText = flattenBlocks(transformed.code.toString());
  const rawStylesheet = {};

  const cleanSelector = (sel) => {
    if (sel.includes(":root")) return [":root"];

    let s = sel.trim();
    if (!s.startsWith(".")) return [];

    // Strip leading dot
    s = s.slice(1);

    // Extract class name (handling escaped chars like active\:scale-95, w-\[48\%\], etc.)
    let classPart = "";
    let i = 0;
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

    const names = [classPart];

    // For variants like disabled:bg-navy-300 or active:opacity-80, also register the base class name
    if (
      classPart.startsWith("disabled:") ||
      classPart.startsWith("active:") ||
      classPart.startsWith("pressed:")
    ) {
      const base = classPart.replace(/^(disabled|active|pressed):/, "");
      if (base && !names.includes(base)) {
        names.push(base);
      }
    }

    return names;
  };

  const parseDeclarations = (bodyText) => {
    const decls = {};
    const parts = bodyText.split(";");
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) continue;
      const prop = trimmed.slice(0, colonIdx).trim();
      const val = trimmed.slice(colonIdx + 1).trim();
      if (!prop || !val) continue;

      if (prop.startsWith("--")) {
        decls[prop] = val;
      } else {
        decls[camelize(prop)] = val;
      }
    }
    return decls;
  };

  // 1. Separate media query blocks
  const mediaBlocks = [];
  const noMediaCss = cssText.replace(/@media\s*([^{]+)\{([\s\S]+?\}\s*)\}/g, (_, query, inner) => {
    mediaBlocks.push({ query: query.trim(), inner });
    return "";
  });

  // 2. Parse regular rules
  const ruleRe = /([^{}]+)\{([^{}]+)\}/g;
  let match;
  while ((match = ruleRe.exec(noMediaCss)) !== null) {
    const rawSelectors = match[1].trim();
    const body = match[2].trim();
    if (rawSelectors.startsWith("@")) continue;

    const selectors = rawSelectors.split(",").map((s) => s.trim());
    const decls = parseDeclarations(body);

    for (const sel of selectors) {
      if (!sel.startsWith(".") && !sel.includes(":root")) continue;
      const names = cleanSelector(sel);
      for (const name of names) {
        rawStylesheet[name] = { ...rawStylesheet[name], ...decls };
      }
    }
  }

  // 3. Parse media query rules
  for (const mb of mediaBlocks) {
    let mMatch;
    const mRuleRe = /([^{}]+)\{([^{}]+)\}/g;
    while ((mMatch = mRuleRe.exec(mb.inner)) !== null) {
      const rawSelectors = mMatch[1].trim();
      const body = mMatch[2].trim();
      const selectors = rawSelectors.split(",").map((s) => s.trim());
      const decls = parseDeclarations(body);

      for (const sel of selectors) {
        if (!sel.startsWith(".") && !sel.includes(":root")) continue;
        const names = cleanSelector(sel);
        for (const name of names) {
          rawStylesheet[name] = {
            ...rawStylesheet[name],
            [`@media ${mb.query}`]: decls,
          };
        }
      }
    }
  }

  return rawStylesheet;
}
