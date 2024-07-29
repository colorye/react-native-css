import { rgbtohex } from "./helper";

const boolRe = /^true|false$/i;
const nullRe = /^null$/i;
const undefinedRe = /^undefined$/i; // Undocumented export

const colorKeywords = {
  black: "#000000",
  silver: "#c0c0c0",
  gray: "#808080",
  white: "#ffffff",
  maroon: "#800000",
  red: "#ff0000",
  purple: "#800080",
  fuchsia: "#ff00ff",
  green: "#008000",
  lime: "#00ff00",
  olive: "#808000",
  yellow: "#ffff00",
  navy: "#000080",
  blue: "#0000ff",
  teal: "#008080",
  aqua: "#00ffff",
  orange: "#ffa500",
  aliceblue: "#f0f8ff",
  antiquewhite: "#faebd7",
  aquamarine: "#7fffd4",
  azure: "#f0ffff",
  beige: "#f5f5dc",
  bisque: "#ffe4c4",
  blanchedalmond: "#ffebcd",
  blueviolet: "#8a2be2",
  brown: "#a52a2a",
  burlywood: "#deb887",
  cadetblue: "#5f9ea0",
  chartreuse: "#7fff00",
  chocolate: "#d2691e",
  coral: "#ff7f50",
  cornflowerblue: "#6495ed",
  cornsilk: "#fff8dc",
  crimson: "#dc143c",
  darkblue: "#00008b",
  darkcyan: "#008b8b",
  darkgoldenrod: "#b8860b",
  darkgray: "#a9a9a9",
  darkgreen: "#006400",
  darkgrey: "#a9a9a9",
  darkkhaki: "#bdb76b",
  darkmagenta: "#8b008b",
  darkolivegreen: "#556b2f",
  darkorange: "#ff8c00",
  darkorchid: "#9932cc",
  darkred: "#8b0000",
  darksalmon: "#e9967a",
  darkseagreen: "#8fbc8f",
  darkslateblue: "#483d8b",
  darkslategray: "#2f4f4f",
  darkslategrey: "#2f4f4f",
  darkturquoise: "#00ced1",
  darkviolet: "#9400d3",
  deeppink: "#ff1493",
  deepskyblue: "#00bfff",
  dimgray: "#696969",
  dimgrey: "#696969",
  dodgerblue: "#1e90ff",
  firebrick: "#b22222",
  floralwhite: "#fffaf0",
  forestgreen: "#228b22",
  gainsboro: "#dcdcdc",
  ghostwhite: "#f8f8ff",
  gold: "#ffd700",
  goldenrod: "#daa520",
  greenyellow: "#adff2f",
  grey: "#808080",
  honeydew: "#f0fff0",
  hotpink: "#ff69b4",
  indianred: "#cd5c5c",
  indigo: "#4b0082",
  ivory: "#fffff0",
  khaki: "#f0e68c",
  lavender: "#e6e6fa",
  lavenderblush: "#fff0f5",
  lawngreen: "#7cfc00",
  lemonchiffon: "#fffacd",
  lightblue: "#add8e6",
  lightcoral: "#f08080",
  lightcyan: "#e0ffff",
  lightgoldenrodyellow: "#fafad2",
  lightgray: "#d3d3d3",
  lightgreen: "#90ee90",
  lightgrey: "#d3d3d3",
  lightpink: "#ffb6c1",
  lightsalmon: "#ffa07a",
  lightseagreen: "#20b2aa",
  lightskyblue: "#87cefa",
  lightslategray: "#778899",
  lightslategrey: "#778899",
  lightsteelblue: "#b0c4de",
  lightyellow: "#ffffe0",
  limegreen: "#32cd32",
  linen: "#faf0e6",
  mediumaquamarine: "#66cdaa",
  mediumblue: "#0000cd",
  mediumorchid: "#ba55d3",
  mediumpurple: "#9370db",
  mediumseagreen: "#3cb371",
  mediumslateblue: "#7b68ee",
  mediumspringgreen: "#00fa9a",
  mediumturquoise: "#48d1cc",
  mediumvioletred: "#c71585",
  midnightblue: "#191970",
  mintcream: "#f5fffa",
  mistyrose: "#ffe4e1",
  moccasin: "#ffe4b5",
  navajowhite: "#ffdead",
  oldlace: "#fdf5e6",
  olivedrab: "#6b8e23",
  orangered: "#ff4500",
  orchid: "#da70d6",
  palegoldenrod: "#eee8aa",
  palegreen: "#98fb98",
  paleturquoise: "#afeeee",
  palevioletred: "#db7093",
  papayawhip: "#ffefd5",
  peachpuff: "#ffdab9",
  peru: "#cd853f",
  pink: "#ffc0cb",
  plum: "#dda0dd",
  powderblue: "#b0e0e6",
  rosybrown: "#bc8f8f",
  royalblue: "#4169e1",
  saddlebrown: "#8b4513",
  salmon: "#fa8072",
  sandybrown: "#f4a460",
  seagreen: "#2e8b57",
  seashell: "#fff5ee",
  sienna: "#a0522d",
  skyblue: "#87ceeb",
  slateblue: "#6a5acd",
  slategray: "#708090",
  slategrey: "#708090",
  snow: "#fffafa",
  springgreen: "#00ff7f",
  steelblue: "#4682b4",
  tan: "#d2b48c",
  thistle: "#d8bfd8",
  tomato: "#ff6347",
  turquoise: "#40e0d0",
  violet: "#ee82ee",
  wheat: "#f5deb3",
  whitesmoke: "#f5f5f5",
  yellowgreen: "#9acd32",
  rebeccapurple: "#663399",
};

const STYLE_REGEX = {
  alignContent: () => ({
    regex: /^(flex-start|flex-end|center|stretch|space-between|space-around)$/g,
  }),
  alignItems: () => ({
    regex: /^(flex-start|flex-end|center|stretch|baseline)$/g,
  }),
  alignSelf: () => ({
    regex: /^(auto|flex-start|flex-end|center|stretch|baseline)$/g,
  }),
  display: () => ({
    regex: /^(none|flex)$/g,
  }),
  textDecoration: () => ({
    regex: /^(none|underline|line-through)$/g,
  }),
};

function STYLE_FACTORY(props) {
  const { value, regex, getter } = props;
  if (value === undefined || !(regex instanceof RegExp)) return;

  if (regex.test(value)) {
    const res = value.match(regex);
    if (typeof getter === "function") return getter(res);
    return res?.length < 2 ? res[0] : res;
  }
}

function COLORS(value) {
  if (value.includes("rgb")) return rgbtohex(value);
  if (value.includes("hsl")) return value;

  const colorKeywordsRe = Object.keys(colorKeywords).join("|");
  const regex = new RegExp(`#([0-9a-fA-F]{3}){1,2}|transparent|${colorKeywordsRe}`, "g");
  return STYLE_FACTORY({ value, regex });
}

function COLOR(value) {
  const colors = COLORS(value);
  if (Array.isArray(colors)) return colors[0];
  return colors;
}

function SPACING(value) {
  const regex = /(-?[0-9]*(\.)?[0-9]+(px|vw|vh|%)?|auto)/g;
  return STYLE_FACTORY({
    value,
    regex,
    getter: (spacings) =>
      spacings.map((spacing) => {
        if (["auto", "%", "vw", "vh"].some((x) => spacing.includes(x))) return spacing;
        return Number(spacing.replace("px", ""));
      }),
  });
}

function LENGTH(value) {
  const spacings = SPACING(value);
  if (Array.isArray(spacings)) return spacings[0];
  return spacings;
}

function BORDER_STYLE(value) {
  const regex = /(solid|dashed|dotted)/g;

  const borderStyle = STYLE_FACTORY({ value, regex });
  if (Array.isArray(borderStyle)) return borderStyle[0];
  return borderStyle;
}

function FONT_WEIGHT(value) {
  const regex = /(light|normal|bold|200|400|700)/g;
  const valueMap = {
    200: "light",
    400: "normal",
    500: "normal",
    700: "bold",
  };
  const parsedValue = valueMap[value] || value.toString();

  const fontWeightStyle = STYLE_FACTORY({ value: parsedValue, regex });
  if (Array.isArray(fontWeightStyle)) return fontWeightStyle[0];
  return fontWeightStyle;
}

function TRANSFORM(value) {
  const regex = /(\w+|-?\d+(deg)?%?)/g;
  const transformTokenRegex =
    /^(perspective|rotate|rotateX|rotateY|scale|scaleX|scaleY|translate|translateX|translateY|skew|skewX|skewY)$/g;

  if (!value) return;
  if (value.includes("none")) return;

  const transforms = STYLE_FACTORY({ value, regex });
  if (!Array.isArray(transforms)) return;

  return transforms
    .reduce((res, token, index) => {
      const isLast = index === transforms.length - 1;
      const isTransformToken = transformTokenRegex.test(token);
      const currentTransform = res[res.length - 1];

      if (isTransformToken) {
        if (currentTransform) res.splice(-1, 1, ...parseTransform(currentTransform));
        res.push([token]);
      } else {
        if (currentTransform) currentTransform.push(token);
      }

      if (isLast) {
        const transform = res[res.length - 1];
        res.splice(-1, 1, ...parseTransform(transform));
      }

      return res;
    }, [])
    .filter(Boolean);

  function parseTransform(transform) {
    if (!Array.isArray(transform) || transform.length < 2) return [];

    const res = [];
    if (["translate", "skew"].includes(transform[0])) {
      if (transform[1])
        res.push({
          [`${transform[0]}X`]: isNaN(transform[1]) ? transform[1] : Number(transform[1]),
        });
      if (transform[2])
        res.push({
          [`${transform[0]}Y`]: isNaN(transform[2]) ? transform[2] : Number(transform[2]),
        });
    } else {
      res.push({ [transform[0]]: isNaN(transform[1]) ? transform[1] : Number(transform[1]) });
    }

    return res;
  }
}

function color(property, value) {
  const color = COLOR(value);
  if (property === "color") {
    return { color };
  }
  return { backgroundColor: color };
}

function border(direction = "all", value) {
  if (value === "none") {
    return { borderWidth: 0 };
  }

  let borderWidth, borderColor, borderStyle;
  let parsed = 0;

  while (parsed < 3) {
    if (borderWidth === undefined && LENGTH(value) !== undefined) {
      borderWidth = LENGTH(value);
    } else if (borderColor === undefined && COLOR(value)) {
      borderColor = COLOR(value);
    } else if (borderStyle === undefined && BORDER_STYLE(value)) {
      borderStyle = BORDER_STYLE(value);
    }
    parsed++;
  }

  if (direction === "TOP") {
    return {
      borderTopWidth: borderWidth,
      borderTopColor: borderColor,
      borderStyle,
    };
  }
  if (direction === "BOTTOM") {
    return {
      borderBottomWidth: borderWidth,
      borderBottomColor: borderColor,
      borderStyle,
    };
  }
  if (direction === "LEFT") {
    return {
      borderLeftWidth: borderWidth,
      borderLeftColor: borderColor,
      borderStyle,
    };
  }
  if (direction === "RIGHT") {
    return {
      borderRightWidth: borderWidth,
      borderRightColor: borderColor,
      borderStyle,
    };
  }
  return {
    borderWidth,
    borderColor,
    borderStyle,
  };
}

function borderColor(_, value) {
  const colors = COLORS(value);
  if (!colors) return;
  if (!Array.isArray(colors)) return { borderColor: colors };

  if (colors.length < 2) return { borderColor: colors[0] };
  if (colors.length < 3) {
    return {
      borderTopColor: colors[0],
      borderRightColor: colors[1],
      borderBottomColor: colors[0],
      borderLeftColor: colors[1],
    };
  }
  if (colors.length < 4) {
    return {
      borderTopColor: colors[0],
      borderRightColor: colors[1],
      borderBottomColor: colors[2],
      borderLeftColor: colors[1],
    };
  }
  return {
    borderTopColor: colors[0],
    borderRightColor: colors[1],
    borderBottomColor: colors[2],
    borderLeftColor: colors[3],
  };
}

function borderWidth(_, value) {
  const spacings = SPACING(value);
  if (!Array.isArray(spacings) || spacings.length === 0) return;

  if (spacings.length < 2) return { borderWidth: spacings[0] };
  if (spacings.length < 3) {
    return {
      borderTopWidth: spacings[0],
      borderRightWidth: spacings[1],
      borderBottomWidth: spacings[0],
      borderLeftWidth: spacings[1],
    };
  }
  if (spacings.length < 4) {
    return {
      borderTopWidth: spacings[0],
      borderRightWidth: spacings[1],
      borderBottomWidth: spacings[2],
      borderLeftWidth: spacings[1],
    };
  }
  return {
    borderTopWidth: spacings[0],
    borderRightWidth: spacings[1],
    borderBottomWidth: spacings[2],
    borderLeftWidth: spacings[3],
  };
}

function marginPadding(property, value) {
  const spacings = SPACING(value);
  if (!Array.isArray(spacings) || spacings.length === 0) return;

  if (spacings.length < 2) {
    return {
      [`${property}Top`]: spacings[0],
      [`${property}Right`]: spacings[0],
      [`${property}Bottom`]: spacings[0],
      [`${property}Left`]: spacings[0],
    };
  }
  if (spacings.length < 3) {
    return {
      [`${property}Top`]: spacings[0],
      [`${property}Right`]: spacings[1],
      [`${property}Bottom`]: spacings[0],
      [`${property}Left`]: spacings[1],
    };
  }
  if (spacings.length < 4) {
    return {
      [`${property}Top`]: spacings[0],
      [`${property}Right`]: spacings[1],
      [`${property}Bottom`]: spacings[2],
      [`${property}Left`]: spacings[1],
    };
  }
  return {
    [`${property}Top`]: spacings[0],
    [`${property}Right`]: spacings[1],
    [`${property}Bottom`]: spacings[2],
    [`${property}Left`]: spacings[3],
  };
}

function fontWeight(_, value) {
  return {
    fontWeight: FONT_WEIGHT(value),
  };
}

function textDecoration(_, value) {
  return {
    textDecorationLine: STYLE_FACTORY({ value, ...STYLE_REGEX.textDecoration(value) }),
  };
}

function transform(_, value) {
  return {
    transform: TRANSFORM(value),
  };
}

const handlers = {
  backgroundColor: color,
  background: color,
  color: (_, value) => color("color", value),

  border,
  borderTop: (_, value) => border("TOP", value),
  borderBottom: (_, value) => border("BOTTOM", value),
  borderLeft: (_, value) => border("LEFT", value),
  borderRight: (_, value) => border("RIGHT", value),
  borderWidth,
  borderColor,

  margin: (_, value) => marginPadding("margin", value),
  padding: (_, value) => marginPadding("padding", value),
  boxShadow: () => {},

  textDecoration,
  fontWeight,

  transform,
  // borderRadius: () => {},
  // flex: () => {},
  // flexFlow: () => {},
  // font: () => {},
  // fontFamily: () => {},
  // fontVariant: () => {},
  // fontWeight: () => {},
  // placeContent: () => {},
  // shadowOffset: () => {},
  // textShadow: () => {},
  // textShadowOffset: () => {},
  // textDecoration: () => {},
  // textDecorationLine: () => {},
  // transform: () => {},
};

/** Transform handlers */
export default function transformHandler(property, value) {
  if (handlers[property]) {
    return handlers[property](property, value);
  }

  if (typeof STYLE_REGEX[property] === "function") {
    return {
      [property]: STYLE_FACTORY({ value, ...STYLE_REGEX[property](value) }),
    };
  }

  if (COLOR(value) !== undefined) {
    return { [property]: COLOR(value) };
  }
  if (LENGTH(value) !== undefined) {
    return { [property]: LENGTH(value) };
  }
  if (FONT_WEIGHT(value) !== undefined) {
    return { [property]: FONT_WEIGHT(value) };
  }
  const boolMatch = value.match(boolRe);
  if (boolMatch) {
    return { [property]: boolMatch[0].toLowerCase() === "true" };
  }
  const nullMatch = value.match(nullRe);
  if (nullMatch) {
    return { [property]: null };
  }
  const undefinedMatch = value.match(undefinedRe);
  if (undefinedMatch) {
    return { [property]: undefined };
  }

  return { [property]: value };
}
