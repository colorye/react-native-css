const UNSUPPORTED_PROPERTIES = ["outline"];
const remOrEmUnitRe = /([\d.]+)(?:rem|em)$/g;

export default function CssTransform() {
  this.transformUnsafeValue = (property, value) => {
    if (!this.isPropertySupported(property, value)) {
      console.info("UNSUPPORTED", property, value);
      return [];
    }

    value = value.trim();
    value = this.transformImportant(property, value);
    value = this.transformPosition(property, value);
    value = this.transformBorderRadius(property, value);

    property = this.getAliasedPropertyName(property);

    return [property, value];
  };

  this.transformUnsupportedUnit = (value) => {
    if (value === undefined) return value;
    return value.replace(remOrEmUnitRe, (_, rem) => {
      return rem * 16;
    });
  };

  this.transformViewportUnit = (value, { width, height } = {}) => {
    if (value === undefined) return value;
    if (!width || !height) return value;

    const viewportUnitRe = /^([+-]?[0-9.]+)(vh|vw|vmin|vmax)$/g;
    const dimensionsMap = {
      vw: width,
      vh: height,
    };
    return value.replace(viewportUnitRe, (_, number, unit) => {
      return (parseFloat(number) * dimensionsMap[unit]) / 100;
    });
  };

  this.removeUnit = (value) => {
    if (value === undefined) return value;
    return value.replace(/px/g, "");
  };

  this.isPropertySupported = (property, value) => {
    if (UNSUPPORTED_PROPERTIES.includes(property)) return false;
    if (value === undefined) return false;
    if (!["number", "string"].includes(typeof value)) return false;
    return true;
  };

  this.transformImportant = (property, value) => {
    return value.replace(/!important/g, "");
  };

  this.transformPosition = (property, value) => {
    if (property === "position" && value === "fixed") {
      return "absolute";
    }
    return value;
  };

  this.transformBorderRadius = (property, value) => {
    if (property === "borderRadius" && value.includes("%")) {
      return 9999;
    }
    return value;
  };

  this.transform = (property, value) => {
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

  this.transformBorder = (property, value) => {
    if (value === "none") {
      return { [`${property}Width`]: 0 };
    }

    const borderRe = /(\S+)(?:\s+(solid|dashed|dotted)(?:\s+(\S+))?)?/g;
    const [, width, style, color] = borderRe.exec(value) || [];

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
    const spacingRe = /\s*(\S+)(?:\s*(\S+)(?:\s*(\S+)(?:\s*(\S+))?)?)?\s*/g;
    const [, top, right, bottom, left] = spacingRe.exec(value) || [];

    const transformed = {};

    // marginHorizontal not support auto
    if (!top) {
      transformed[`${property}Top`] = 0;
      transformed[`${property}Right`] = 0;
      transformed[`${property}Bottom`] = 0;
      transformed[`${property}Left`] = 0;
    } else if (!right) {
      transformed[`${property}Top`] = isNaN(top) ? top : Number(top);
      transformed[`${property}Right`] = isNaN(top) ? top : Number(top);
      transformed[`${property}Bottom`] = isNaN(top) ? top : Number(top);
      transformed[`${property}Left`] = isNaN(top) ? top : Number(top);
    } else if (!bottom) {
      transformed[`${property}Top`] = isNaN(top) ? top : Number(top);
      transformed[`${property}Right`] = isNaN(right) ? right : Number(right);
      transformed[`${property}Bottom`] = isNaN(top) ? top : Number(top);
      transformed[`${property}Left`] = isNaN(right) ? right : Number(right);
    } else if (!left) {
      transformed[`${property}Top`] = isNaN(top) ? top : Number(top);
      transformed[`${property}Right`] = isNaN(right) ? right : Number(right);
      transformed[`${property}Bottom`] = isNaN(bottom) ? bottom : Number(bottom);
      transformed[`${property}Left`] = isNaN(right) ? right : Number(right);
    } else {
      transformed[`${property}Top`] = isNaN(top) ? top : Number(top);
      transformed[`${property}Right`] = isNaN(right) ? right : Number(right);
      transformed[`${property}Bottom`] = isNaN(bottom) ? bottom : Number(bottom);
      transformed[`${property}Left`] = isNaN(left) ? left : Number(left);
    }

    return transformed;
  };

  this.transformFontWeight = (property, value) => {
    const fontWeightRe = /(normal|bold|100|200|300|400|500|600|700|800|900)/g;

    if (!fontWeightRe.test(value)) return;
    return {
      [property]: value,
    };
  };

  this.transformTransform = (property, value) => {
    const transformRe =
      /(perspective|rotate|rotateX|rotateY|scale|scaleX|scaleY|translate|translateX|translateY|skew|skewX|skewY)\s*\(\s*([^,)]+)[,\s]*([^)]+)?\)/g;

    const transforms = [];
    let match;
    do {
      match = transformRe.exec(value);
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

  this.getAliasedPropertyName = (property) => {
    if (property === "background") property = "backgroundColor";
    return property;
  };

  return this;
}
