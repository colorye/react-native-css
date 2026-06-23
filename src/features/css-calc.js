const calcRe = /calc\(([^)]+)\)/g;

const colorRe1 = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+)\s*)?\)/g;
const colorRe2 = /rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)/g;

const itohex = (component) => {
  const hex = Number(component).toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
};

function splitTopLevelCommas(str) {
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
    } else if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
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
  const percentEndMatch = arg.match(/\s+([\d.]+)%$/i);
  if (percentEndMatch) {
    const percentage = parseFloat(percentEndMatch[1]);
    const colorStr = arg.substring(0, arg.length - percentEndMatch[0].length).trim();
    return { colorStr, percentage };
  }

  // Check if there is a percentage at the beginning
  const percentStartMatch = arg.match(/^([\d.]+)%\s+/i);
  if (percentStartMatch) {
    const percentage = parseFloat(percentStartMatch[1]);
    const colorStr = arg.substring(percentStartMatch[0].length).trim();
    return { colorStr, percentage };
  }

  return { colorStr: arg, percentage: null };
}

function hslToRgb(h, s, l) {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function parseColor(colorStr) {
  if (!colorStr) return null;
  colorStr = colorStr.trim().toLowerCase();

  if (colorStr === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  // Hex
  if (colorStr.startsWith("#")) {
    const hex = colorStr.substring(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      return { r, g, b, a };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
    return null;
  }

  // rgb / rgba
  const rgbMatch = colorStr.match(/rgba?\(\s*([\d.]+)(%?)\s*[\s,]\s*([\d.]+)(%?)\s*[\s,]\s*([\d.]+)(%?)(?:\s*[\s,/]\s*([\d.]+)(%?))?\s*\)/);
  if (rgbMatch) {
    let r = parseFloat(rgbMatch[1]);
    if (rgbMatch[2] === "%") r = (r / 100) * 255;
    let g = parseFloat(rgbMatch[3]);
    if (rgbMatch[4] === "%") g = (g / 100) * 255;
    let b = parseFloat(rgbMatch[5]);
    if (rgbMatch[6] === "%") b = (b / 100) * 255;

    let a = 1;
    if (rgbMatch[7] !== undefined) {
      a = parseFloat(rgbMatch[7]);
      if (rgbMatch[8] === "%") a = a / 100;
    }
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a };
  }

  // hsl / hsla
  const hslMatch = colorStr.match(/hsla?\(\s*([\d.]+)(?:deg)?\s*[\s,]\s*([\d.]+)%\s*[\s,]\s*([\d.]+)%\s*(?:\s*[\s,/]\s*([\d.]+)(%?))?\s*\)/);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]);
    const s = parseFloat(hslMatch[2]);
    const l = parseFloat(hslMatch[3]);
    let a = 1;
    if (hslMatch[4] !== undefined) {
      a = parseFloat(hslMatch[4]);
      if (hslMatch[5] === "%") a = a / 100;
    }
    const rgb = hslToRgb(h, s, l);
    return { ...rgb, a };
  }

  // Basic named colors fallback
  const basicColors = {
    white: { r: 255, g: 255, b: 255, a: 1 },
    black: { r: 0, g: 0, b: 0, a: 1 },
    red: { r: 255, g: 0, b: 0, a: 1 },
    green: { r: 0, g: 128, b: 0, a: 1 },
    blue: { r: 0, g: 0, b: 255, a: 1 },
    yellow: { r: 255, g: 255, b: 0, a: 1 },
    magenta: { r: 255, g: 0, b: 255, a: 1 },
    cyan: { r: 0, g: 255, b: 255, a: 1 },
  };

  if (basicColors[colorStr]) {
    return basicColors[colorStr];
  }

  return null;
}

function resolveColorMix(value) {
  if (typeof value !== "string") return value;

  let index;
  while ((index = value.toLowerCase().indexOf("color-mix(")) !== -1) {
    // Find matching closing parenthesis
    let depth = 1;
    let j = index + "color-mix(".length;
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

    const innerContent = value.substring(index + "color-mix(".length, j - 1);

    // Parse innerContent: "in <color-space>, <args>"
    const commaIndex = innerContent.indexOf(",");
    if (commaIndex === -1) {
      // Invalid syntax, skip this one by replacing "color-mix(" with a placeholder temporarily
      value = value.substring(0, index) + "COLOR_MIX_TEMP(" + value.substring(index + "color-mix(".length);
      continue;
    }

    const argsPart = innerContent.substring(commaIndex + 1).trim();

    // Check if argsPart contains another color-mix. If so, resolve the inner one first.
    if (argsPart.toLowerCase().includes("color-mix(")) {
      const resolvedArgsPart = resolveColorMix(argsPart);
      value = value.substring(0, index + "color-mix(".length + commaIndex + 1) + " " + resolvedArgsPart + value.substring(j - 1);
      continue;
    }

    // Now we can resolve this color-mix
    const args = splitTopLevelCommas(argsPart);
    if (args.length !== 2) {
      // Invalid syntax
      value = value.substring(0, index) + "COLOR_MIX_TEMP(" + value.substring(index + "color-mix(".length);
      continue;
    }

    const arg1 = parseColorMixArg(args[0]);
    const arg2 = parseColorMixArg(args[1]);

    const c1 = parseColor(arg1.colorStr);
    const c2 = parseColor(arg2.colorStr);

    if (!c1 || !c2) {
      // Parsing failed, skip
      value = value.substring(0, index) + "COLOR_MIX_TEMP(" + value.substring(index + "color-mix(".length);
      continue;
    }

    const p1 = arg1.percentage;
    const p2 = arg2.percentage;

    let w1, w2;
    if (p1 !== null && p2 !== null) {
      const sum = p1 + p2;
      if (sum > 100) {
        w1 = (p1 / sum) * 100;
        w2 = (p2 / sum) * 100;
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

    const a1 = c1.a;
    const a2 = c2.a;

    const totalWeight = w1 + w2;
    let resolvedColor;
    if (totalWeight === 0) {
      resolvedColor = "transparent";
    } else {
      const f1 = w1 / totalWeight;
      const f2 = w2 / totalWeight;

      const mixedA = a1 * f1 + a2 * f2;

      let mixedR, mixedG, mixedB;
      if (mixedA === 0) {
        mixedR = 0;
        mixedG = 0;
        mixedB = 0;
      } else {
        mixedR = Math.round((c1.r * a1 * f1 + c2.r * a2 * f2) / mixedA);
        mixedG = Math.round((c1.g * a1 * f1 + c2.g * a2 * f2) / mixedA);
        mixedB = Math.round((c1.b * a1 * f1 + c2.b * a2 * f2) / mixedA);
      }

      const finalA = totalWeight < 100 ? mixedA * (totalWeight / 100) : mixedA;
      const roundedA = Math.round(finalA * 10000) / 10000;

      resolvedColor = `rgba(${mixedR}, ${mixedG}, ${mixedB}, ${roundedA})`;
    }

    value = value.substring(0, index) + resolvedColor + value.substring(j);
  }

  // Restore placeholders
  value = value.replace(/COLOR_MIX_TEMP\(/gi, "color-mix(");

  return value;
}

export default function CssCalc() {
  this.calc = (value) => {
    if (value === undefined || typeof value !== "string") return value;

    return value.replace(calcRe, (_, calc) => {
      try {
        // eslint-disable-next-line
        const calcFunc = new Function(`return ${calc}`);
        const calcValue = calcFunc();
        return calcValue;
      } catch {
        return 0;
      }
    });
  };

  this.calcColor = (value) => {
    if (value === undefined || typeof value !== "string") return value;

    value = resolveColorMix(value);

    value = value.replace(colorRe1, (_, r, g, b, a) => {
      a = parseFloat(a);
      if (isNaN(a) || a >= 1) return `#${itohex(r)}${itohex(g)}${itohex(b)}`;

      a = Math.round(a * 255);
      return `#${itohex(r)}${itohex(g)}${itohex(b)}${itohex(a)}`;
    });
    value = value.replace(colorRe2, (_, r, g, b, a) => {
      a = parseFloat(a);
      if (isNaN(a) || a >= 1) return `#${itohex(r)}${itohex(g)}${itohex(b)}`;

      a = Math.round(a * 255);
      return `#${itohex(r)}${itohex(g)}${itohex(b)}${itohex(a)}`;
    });

    return value;
  };

  return this;
}
