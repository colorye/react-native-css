function flattenLayersAndSupports(cssStr) {
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

    // Check for @layer or @supports
    if (cssStr[i] === "@") {
      const remaining = cssStr.substring(i);
      const layerMatch = remaining.match(/^@layer\s+[^{]+\{/i);
      const supportsMatch = remaining.match(/^@supports\s+[^{]+\{/i);

      if (layerMatch || supportsMatch) {
        const match = layerMatch || supportsMatch;
        const matchStr = match[0];
        let braceCount = 1;
        let j = i + matchStr.length;
        let innerContent = "";

        while (j < len && braceCount > 0) {
          if (cssStr[j] === "/" && cssStr[j + 1] === "*") {
            const commentEnd = cssStr.indexOf("*/", j + 2);
            if (commentEnd === -1) {
              innerContent += cssStr.substring(j);
              j = len;
              break;
            }
            innerContent += cssStr.substring(j, commentEnd + 2);
            j = commentEnd + 2;
            continue;
          }

          if (cssStr[j] === '"' || cssStr[j] === "'") {
            const char = cssStr[j];
            let strEnd = j + 1;
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
            innerContent += cssStr.substring(j, strEnd);
            j = strEnd;
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

        const flattenedInner = flattenLayersAndSupports(innerContent);
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
  let result = cssStr.replace(
    /\(\s*width\s*>=\s*([^)]+)\)/gi,
    "(min-width: $1)",
  );
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
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  let r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let b_rgb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  r = linearToSrgb(r);
  g = linearToSrgb(g);
  b_rgb = linearToSrgb(b_rgb);

  r = Math.max(0, Math.min(255, Math.round(r * 255)));
  g = Math.max(0, Math.min(255, Math.round(g * 255)));
  b_rgb = Math.max(0, Math.min(255, Math.round(b_rgb * 255)));

  return { r, g, b: b_rgb };
}

function convertOklchToRgbOrHex(cssStr) {
  const oklchRegex =
    /oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/gi;

  return cssStr.replace(oklchRegex, (match, lStr, cStr, hStr, aStr) => {
    let l = parseFloat(lStr);
    if (lStr.includes("%")) {
      l = l / 100;
    }
    const c = parseFloat(cStr);
    const h = parseFloat(hStr);

    const { r, g, b } = oklchToRgb(l, c, h);

    if (aStr) {
      let a = parseFloat(aStr);
      if (aStr.includes("%")) {
        a = a / 100;
      }
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  });
}

function removeContainerClass(cssStr) {
  const index = cssStr.indexOf(".container {");
  if (index === -1) return cssStr;

  let braceCount = 1;
  let j = index + ".container {".length;
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

export function preprocessTailwindCss(css) {
  let preprocessedCss = flattenLayersAndSupports(css);
  preprocessedCss = removeContainerClass(preprocessedCss);
  preprocessedCss = simplifyDoubleSelectors(preprocessedCss);
  preprocessedCss = convertOklchToRgbOrHex(preprocessedCss);
  preprocessedCss = convertRangeMediaQueries(preprocessedCss);
  return preprocessedCss;
}
