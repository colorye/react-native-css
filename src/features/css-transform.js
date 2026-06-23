const UNSUPPORTED_PROPERTIES = ["outline"];
const remOrEmUnitRe = /([\d.]+)(?:rem|em)\b/g;

export default function CssTransform() {
  this.transformUnsafeValue = (property, value) => {
    if (!this.isPropertySupported(property, value)) {
      console.info("UNSUPPORTED", property, value);
      return [];
    }

    if (typeof value === "string") {
      value = value.trim();
      value = this.transformImportant(property, value);
    }
    value = this.transformPosition(property, value);
    value = this.transformBorderRadius(property, value);

    property = this.getAliasedPropertyName(property);

    return [property, value];
  };

  this.transformUnsupportedUnit = (value) => {
    if (value === undefined || typeof value !== "string") return value;
    remOrEmUnitRe.lastIndex = 0;
    return value.replace(remOrEmUnitRe, (_, rem) => {
      return rem * 16;
    });
  };

  this.transformViewportUnit = (value, { width, height } = {}) => {
    if (value === undefined || typeof value !== "string") return value;
    if (!width || !height) return value;

    const viewportUnitRe = /([+-]?[0-9.]+)(vh|vw|vmin|vmax)\b/g;
    const dimensionsMap = {
      vw: width,
      vh: height,
    };
    return value.replace(viewportUnitRe, (_, number, unit) => {
      return (parseFloat(number) * dimensionsMap[unit]) / 100;
    });
  };

  this.removeUnit = (value) => {
    if (value === undefined || typeof value !== "string") return value;
    return value.replace(/px/g, "");
  };

  this.isPropertySupported = (property, value) => {
    if (UNSUPPORTED_PROPERTIES.includes(property)) return false;
    if (value === undefined) return false;
    if (!["number", "string"].includes(typeof value)) return false;
    return true;
  };

  this.transformImportant = (property, value) => {
    if (typeof value !== "string") return value;
    return value.replace(/!important/g, "");
  };

  this.transformPosition = (property, value) => {
    if (property === "position" && value === "fixed") {
      return "absolute";
    }
    return value;
  };

  this.transformBorderRadius = (property, value) => {
    if (property.toLowerCase().endsWith("radius") && typeof value === "string" && value.includes("%")) {
      return 9999;
    }
    return value;
  };

  this.transformBorder = (property, value) => {
    if (value === "none") {
      return { [`${property}Width`]: 0 };
    }

    const borderRe = /(\S+)(?:\s+(solid|dashed|dotted)(?:\s+(\S+))?)?/g;
    const [, width, style, color] = borderRe.exec(String(value)) || [];

    const transformed = {};

    if (width) {
      transformed[`${property}Width`] = isNaN(width) ? width : Number(width);
    } else {
      transformed[`${property}Width`] = 0;
    }

    if (style) {
      transformed[`${property}Style`] = style;
    }

    if (color) {
      transformed[`${property}Color`] = color;
    }

    return transformed;
  };

  this.transformSpacing = (property, value) => {
    const strValue = String(value).trim();
    const parts = [];
    let current = "";
    let depth = 0;
    for (let i = 0; i < strValue.length; i++) {
      const char = strValue[i];
      if (char === "(") {
        depth++;
        current += char;
      } else if (char === ")") {
        depth--;
        current += char;
      } else if (char === " " && depth === 0) {
        if (current) {
          parts.push(current);
          current = "";
        }
      } else {
        current += char;
      }
    }
    if (current) {
      parts.push(current);
    }

    const cleanedParts = parts.filter(Boolean);

    const toNumberOrString = (val) => {
      return isNaN(val) ? val : Number(val);
    };

    const transformed = {};

    if (cleanedParts.length === 0) {
      transformed[`${property}Top`] = 0;
      transformed[`${property}Right`] = 0;
      transformed[`${property}Bottom`] = 0;
      transformed[`${property}Left`] = 0;
    } else if (cleanedParts.length === 1) {
      const top = cleanedParts[0];
      transformed[`${property}Top`] = toNumberOrString(top);
      transformed[`${property}Right`] = toNumberOrString(top);
      transformed[`${property}Bottom`] = toNumberOrString(top);
      transformed[`${property}Left`] = toNumberOrString(top);
    } else if (cleanedParts.length === 2) {
      const top = cleanedParts[0];
      const right = cleanedParts[1];
      transformed[`${property}Top`] = toNumberOrString(top);
      transformed[`${property}Right`] = toNumberOrString(right);
      transformed[`${property}Bottom`] = toNumberOrString(top);
      transformed[`${property}Left`] = toNumberOrString(right);
    } else if (cleanedParts.length === 3) {
      const top = cleanedParts[0];
      const right = cleanedParts[1];
      const bottom = cleanedParts[2];
      transformed[`${property}Top`] = toNumberOrString(top);
      transformed[`${property}Right`] = toNumberOrString(right);
      transformed[`${property}Bottom`] = toNumberOrString(bottom);
      transformed[`${property}Left`] = toNumberOrString(right);
    } else {
      const top = cleanedParts[0];
      const right = cleanedParts[1];
      const bottom = cleanedParts[2];
      const left = cleanedParts[3];
      transformed[`${property}Top`] = toNumberOrString(top);
      transformed[`${property}Right`] = toNumberOrString(right);
      transformed[`${property}Bottom`] = toNumberOrString(bottom);
      transformed[`${property}Left`] = toNumberOrString(left);
    }

    return transformed;
  };

  this.transformFontWeight = (property, value) => {
    const fontWeightRe = /(normal|bold|100|200|300|400|500|600|700|800|900)/g;

    if (!fontWeightRe.test(String(value))) return;
    return {
      [property]: String(value),
    };
  };

  this.transformTransform = (property, value) => {
    const transformRe =
      /(perspective|rotate|rotateX|rotateY|scale|scaleX|scaleY|translate|translateX|translateY|skew|skewX|skewY)\s*\(\s*([^,)]+)[,\s]*([^)]+)?\)/g;

    const transforms = [];
    let match;
    const strValue = String(value);
    do {
      match = transformRe.exec(strValue);
      if (!match) break;

      const [, token, val1, val2] = match;

      if (["translate", "skew"].includes(token)) {
        transforms.push({ [`${token}X`]: isNaN(val1) ? val1 : Number(val1) });
        transforms.push({ [`${token}Y`]: isNaN(val2) ? val2 : Number(val2) });
      } else {
        transforms.push({ [token]: isNaN(val1) ? val1 : Number(val1) });
      }
    } while (match);

    return {
      [property]: transforms,
    };
  };

  this.transformFontScaling = (property, value, { width, roundFn }) => {
    if (!["fontSize", "lineHeight"].includes(property)) return value;

    // Base width for design (iPhone 6/7/8)
    const baseWidth = 375;

    // Calculate scaling factor based on device width
    const scaleFactor = width ? width / baseWidth : 1;
    if (!isNaN(value)) {
      return roundFn(Number(value) * scaleFactor);
    }

    return value;
  };

  this.transformLogicalProperty = (property, value) => {
    const strValue = String(value).trim();
    const parts = [];
    let current = "";
    let depth = 0;
    for (let i = 0; i < strValue.length; i++) {
      const char = strValue[i];
      if (char === "(") {
        depth++;
        current += char;
      } else if (char === ")") {
        depth--;
        current += char;
      } else if (char === " " && depth === 0) {
        if (current) {
          parts.push(current);
          current = "";
        }
      } else {
        current += char;
      }
    }
    if (current) {
      parts.push(current);
    }

    const cleanedParts = parts.filter(Boolean);

    const toNumberOrString = (val) => {
      return isNaN(val) ? val : Number(val);
    };

    if (property === "paddingInlineStart") return { paddingStart: toNumberOrString(value) };
    if (property === "paddingInlineEnd") return { paddingEnd: toNumberOrString(value) };
    if (property === "marginInlineStart") return { marginStart: toNumberOrString(value) };
    if (property === "marginInlineEnd") return { marginEnd: toNumberOrString(value) };
    if (property === "insetInlineStart") return { start: toNumberOrString(value) };
    if (property === "insetInlineEnd") return { end: toNumberOrString(value) };
    if (property === "insetBlockStart") return { top: toNumberOrString(value) };
    if (property === "insetBlockEnd") return { bottom: toNumberOrString(value) };

    if (property === "paddingInline") {
      if (cleanedParts.length === 1) {
        return { paddingHorizontal: toNumberOrString(cleanedParts[0]) };
      }
      if (cleanedParts.length >= 2) {
        return {
          paddingStart: toNumberOrString(cleanedParts[0]),
          paddingEnd: toNumberOrString(cleanedParts[1]),
        };
      }
    }

    if (property === "marginInline") {
      if (cleanedParts.length === 1) {
        return { marginHorizontal: toNumberOrString(cleanedParts[0]) };
      }
      if (cleanedParts.length >= 2) {
        return {
          marginStart: toNumberOrString(cleanedParts[0]),
          marginEnd: toNumberOrString(cleanedParts[1]),
        };
      }
    }

    if (property === "paddingBlock") {
      if (cleanedParts.length === 1) {
        return { paddingVertical: toNumberOrString(cleanedParts[0]) };
      }
      if (cleanedParts.length >= 2) {
        return {
          paddingTop: toNumberOrString(cleanedParts[0]),
          paddingBottom: toNumberOrString(cleanedParts[1]),
        };
      }
    }

    if (property === "marginBlock") {
      if (cleanedParts.length === 1) {
        return { marginVertical: toNumberOrString(cleanedParts[0]) };
      }
      if (cleanedParts.length >= 2) {
        return {
          marginTop: toNumberOrString(cleanedParts[0]),
          marginBottom: toNumberOrString(cleanedParts[1]),
        };
      }
    }

    if (property === "insetInline") {
      if (cleanedParts.length === 1) {
        return {
          left: toNumberOrString(cleanedParts[0]),
          right: toNumberOrString(cleanedParts[0]),
        };
      }
      if (cleanedParts.length >= 2) {
        return {
          start: toNumberOrString(cleanedParts[0]),
          end: toNumberOrString(cleanedParts[1]),
        };
      }
    }

    if (property === "insetBlock") {
      if (cleanedParts.length === 1) {
        return {
          top: toNumberOrString(cleanedParts[0]),
          bottom: toNumberOrString(cleanedParts[0]),
        };
      }
      if (cleanedParts.length >= 2) {
        return {
          top: toNumberOrString(cleanedParts[0]),
          bottom: toNumberOrString(cleanedParts[1]),
        };
      }
    }

    return null;
  };

  this.transform = (property, value, { width, height }) => {
    if (property.toLowerCase().endsWith("radius")) {
      value = this.transformBorderRadius(property, value);
    }

    if (
      [
        "paddingInline",
        "marginInline",
        "paddingBlock",
        "marginBlock",
        "paddingInlineStart",
        "paddingInlineEnd",
        "marginInlineStart",
        "marginInlineEnd",
        "insetInline",
        "insetInlineStart",
        "insetInlineEnd",
        "insetBlock",
        "insetBlockStart",
        "insetBlockEnd",
      ].includes(property)
    ) {
      return this.transformLogicalProperty(property, value);
    }

    if (["border", "borderTop", "borderBottom", "borderLeft", "borderRight"].includes(property)) {
      return this.transformBorder(property, value);
    }

    if (["padding", "margin"].includes(property)) {
      return this.transformSpacing(property, value);
    }

    if (["flex"].includes(property)) {
      return { flex: parseInt(value) };
    }

    if (["fontWeight"].includes(property)) {
      return this.transformFontWeight(property, value);
    }

    if (["transform"].includes(property)) {
      return this.transformTransform(property, value);
    }

    return { [property]: isNaN(value) ? value : Number(value) };
  };

  this.getAliasedPropertyName = (property) => {
    if (property === "background") property = "backgroundColor";
    return property;
  };

  return this;
}
