"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = transformHandler;
var _helper = require("./helper");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }
function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
var boolRe = /^true|false$/i;
var nullRe = /^null$/i;
var undefinedRe = /^undefined$/i; // Undocumented export

var colorKeywords = {
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
  rebeccapurple: "#663399"
};
var STYLE_REGEX = {
  alignContent: function alignContent() {
    return {
      regex: /^(flex-start|flex-end|center|stretch|space-between|space-around)$/g
    };
  },
  alignItems: function alignItems() {
    return {
      regex: /^(flex-start|flex-end|center|stretch|baseline)$/g
    };
  },
  alignSelf: function alignSelf() {
    return {
      regex: /^(auto|flex-start|flex-end|center|stretch|baseline)$/g
    };
  },
  display: function display() {
    return {
      regex: /^(none|flex)$/g
    };
  },
  textDecoration: function textDecoration() {
    return {
      regex: /^(none|underline|line-through)$/g
    };
  }
};
function STYLE_FACTORY(props) {
  var value = props.value,
    regex = props.regex,
    getter = props.getter;
  if (value === undefined || !(regex instanceof RegExp)) return;
  if (regex.test(value)) {
    var res = value.match(regex);
    if (typeof getter === "function") return getter(res);
    return (res === null || res === void 0 ? void 0 : res.length) < 2 ? res[0] : res;
  }
}
function COLORS(value) {
  if (value.includes("rgb")) return (0, _helper.rgbtohex)(value);
  if (value.includes("hsl")) return value;
  var colorKeywordsRe = Object.keys(colorKeywords).join("|");
  var regex = new RegExp("#([0-9a-fA-F]{3}){1,2}|transparent|".concat(colorKeywordsRe), "g");
  return STYLE_FACTORY({
    value: value,
    regex: regex
  });
}
function COLOR(value) {
  var colors = COLORS(value);
  if (Array.isArray(colors)) return colors[0];
  return colors;
}
function SPACING(value) {
  var regex = /(-?[0-9]*(\.)?[0-9]+(px|vw|vh|%)?|auto)/g;
  return STYLE_FACTORY({
    value: value,
    regex: regex,
    getter: function getter(spacings) {
      return spacings.map(function (spacing) {
        if (["auto", "%", "vw", "vh"].some(function (x) {
          return spacing.includes(x);
        })) return spacing;
        return Number(spacing.replace("px", ""));
      });
    }
  });
}
function LENGTH(value) {
  var spacings = SPACING(value);
  if (Array.isArray(spacings)) return spacings[0];
  return spacings;
}
function BORDER_STYLE(value) {
  var regex = /(solid|dashed|dotted)/g;
  var borderStyle = STYLE_FACTORY({
    value: value,
    regex: regex
  });
  if (Array.isArray(borderStyle)) return borderStyle[0];
  return borderStyle;
}
function FONT_WEIGHT(value) {
  var regex = /(light|normal|bold|200|400|700)/g;
  var valueMap = {
    200: "light",
    400: "normal",
    500: "normal",
    700: "bold"
  };
  var parsedValue = valueMap[value] || value.toString();
  var fontWeightStyle = STYLE_FACTORY({
    value: parsedValue,
    regex: regex
  });
  if (Array.isArray(fontWeightStyle)) return fontWeightStyle[0];
  return fontWeightStyle;
}
function TRANSFORM(value) {
  var regex = /(\w+|-?\d+(deg)?%?)/g;
  var transformTokenRegex = /^(perspective|rotate|rotateX|rotateY|scale|scaleX|scaleY|translate|translateX|translateY|skew|skewX|skewY)$/g;
  if (!value) return;
  if (value.includes("none")) return;
  var transforms = STYLE_FACTORY({
    value: value,
    regex: regex
  });
  if (!Array.isArray(transforms)) return;
  return transforms.reduce(function (res, token, index) {
    var isLast = index === transforms.length - 1;
    var isTransformToken = transformTokenRegex.test(token);
    var currentTransform = res[res.length - 1];
    if (isTransformToken) {
      if (currentTransform) res.splice.apply(res, [-1, 1].concat(_toConsumableArray(parseTransform(currentTransform))));
      res.push([token]);
    } else {
      if (currentTransform) currentTransform.push(token);
    }
    if (isLast) {
      var _transform = res[res.length - 1];
      res.splice.apply(res, [-1, 1].concat(_toConsumableArray(parseTransform(_transform))));
    }
    return res;
  }, []).filter(Boolean);
  function parseTransform(transform) {
    if (!Array.isArray(transform) || transform.length < 2) return [];
    var res = [];
    if (["translate", "skew"].includes(transform[0])) {
      if (transform[1]) res.push(_defineProperty({}, "".concat(transform[0], "X"), isNaN(transform[1]) ? transform[1] : Number(transform[1])));
      if (transform[2]) res.push(_defineProperty({}, "".concat(transform[0], "Y"), isNaN(transform[2]) ? transform[2] : Number(transform[2])));
    } else {
      res.push(_defineProperty({}, transform[0], isNaN(transform[1]) ? transform[1] : Number(transform[1])));
    }
    return res;
  }
}
function _color(property, value) {
  var color = COLOR(value);
  if (property === "color") {
    return {
      color: color
    };
  }
  return {
    backgroundColor: color
  };
}
function border() {
  var direction = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "all";
  var value = arguments.length > 1 ? arguments[1] : undefined;
  if (value === "none") {
    return {
      borderWidth: 0
    };
  }
  var borderWidth, borderColor, borderStyle;
  var parsed = 0;
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
      borderStyle: borderStyle
    };
  }
  if (direction === "BOTTOM") {
    return {
      borderBottomWidth: borderWidth,
      borderBottomColor: borderColor,
      borderStyle: borderStyle
    };
  }
  if (direction === "LEFT") {
    return {
      borderLeftWidth: borderWidth,
      borderLeftColor: borderColor,
      borderStyle: borderStyle
    };
  }
  if (direction === "RIGHT") {
    return {
      borderRightWidth: borderWidth,
      borderRightColor: borderColor,
      borderStyle: borderStyle
    };
  }
  return {
    borderWidth: borderWidth,
    borderColor: borderColor,
    borderStyle: borderStyle
  };
}
function borderColor(_, value) {
  var colors = COLORS(value);
  if (!colors) return;
  if (!Array.isArray(colors)) return {
    borderColor: colors
  };
  if (colors.length < 2) return {
    borderColor: colors[0]
  };
  if (colors.length < 3) {
    return {
      borderTopColor: colors[0],
      borderRightColor: colors[1],
      borderBottomColor: colors[0],
      borderLeftColor: colors[1]
    };
  }
  if (colors.length < 4) {
    return {
      borderTopColor: colors[0],
      borderRightColor: colors[1],
      borderBottomColor: colors[2],
      borderLeftColor: colors[1]
    };
  }
  return {
    borderTopColor: colors[0],
    borderRightColor: colors[1],
    borderBottomColor: colors[2],
    borderLeftColor: colors[3]
  };
}
function borderWidth(_, value) {
  var spacings = SPACING(value);
  if (!Array.isArray(spacings) || spacings.length === 0) return;
  if (spacings.length < 2) return {
    borderWidth: spacings[0]
  };
  if (spacings.length < 3) {
    return {
      borderTopWidth: spacings[0],
      borderRightWidth: spacings[1],
      borderBottomWidth: spacings[0],
      borderLeftWidth: spacings[1]
    };
  }
  if (spacings.length < 4) {
    return {
      borderTopWidth: spacings[0],
      borderRightWidth: spacings[1],
      borderBottomWidth: spacings[2],
      borderLeftWidth: spacings[1]
    };
  }
  return {
    borderTopWidth: spacings[0],
    borderRightWidth: spacings[1],
    borderBottomWidth: spacings[2],
    borderLeftWidth: spacings[3]
  };
}
function marginPadding(property, value) {
  var _ref4;
  var spacings = SPACING(value);
  if (!Array.isArray(spacings) || spacings.length === 0) return;
  if (spacings.length < 2) {
    var _ref;
    return _ref = {}, _defineProperty(_ref, "".concat(property, "Top"), spacings[0]), _defineProperty(_ref, "".concat(property, "Right"), spacings[0]), _defineProperty(_ref, "".concat(property, "Bottom"), spacings[0]), _defineProperty(_ref, "".concat(property, "Left"), spacings[0]), _ref;
  }
  if (spacings.length < 3) {
    var _ref2;
    return _ref2 = {}, _defineProperty(_ref2, "".concat(property, "Top"), spacings[0]), _defineProperty(_ref2, "".concat(property, "Right"), spacings[1]), _defineProperty(_ref2, "".concat(property, "Bottom"), spacings[0]), _defineProperty(_ref2, "".concat(property, "Left"), spacings[1]), _ref2;
  }
  if (spacings.length < 4) {
    var _ref3;
    return _ref3 = {}, _defineProperty(_ref3, "".concat(property, "Top"), spacings[0]), _defineProperty(_ref3, "".concat(property, "Right"), spacings[1]), _defineProperty(_ref3, "".concat(property, "Bottom"), spacings[2]), _defineProperty(_ref3, "".concat(property, "Left"), spacings[1]), _ref3;
  }
  return _ref4 = {}, _defineProperty(_ref4, "".concat(property, "Top"), spacings[0]), _defineProperty(_ref4, "".concat(property, "Right"), spacings[1]), _defineProperty(_ref4, "".concat(property, "Bottom"), spacings[2]), _defineProperty(_ref4, "".concat(property, "Left"), spacings[3]), _ref4;
}
function fontWeight(_, value) {
  return {
    fontWeight: FONT_WEIGHT(value)
  };
}
function textDecoration(_, value) {
  return {
    textDecorationLine: STYLE_FACTORY(_objectSpread({
      value: value
    }, STYLE_REGEX.textDecoration(value)))
  };
}
function transform(_, value) {
  return {
    transform: TRANSFORM(value)
  };
}
var handlers = {
  backgroundColor: _color,
  background: _color,
  color: function color(_, value) {
    return _color("color", value);
  },
  border: border,
  borderTop: function borderTop(_, value) {
    return border("TOP", value);
  },
  borderBottom: function borderBottom(_, value) {
    return border("BOTTOM", value);
  },
  borderLeft: function borderLeft(_, value) {
    return border("LEFT", value);
  },
  borderRight: function borderRight(_, value) {
    return border("RIGHT", value);
  },
  borderWidth: borderWidth,
  borderColor: borderColor,
  margin: function margin(_, value) {
    return marginPadding("margin", value);
  },
  padding: function padding(_, value) {
    return marginPadding("padding", value);
  },
  boxShadow: function boxShadow() {},
  textDecoration: textDecoration,
  fontWeight: fontWeight,
  transform: transform
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
function transformHandler(property, value) {
  if (handlers[property]) {
    return handlers[property](property, value);
  }
  if (typeof STYLE_REGEX[property] === "function") {
    return _defineProperty({}, property, STYLE_FACTORY(_objectSpread({
      value: value
    }, STYLE_REGEX[property](value))));
  }
  if (COLOR(value) !== undefined) {
    return _defineProperty({}, property, COLOR(value));
  }
  if (LENGTH(value) !== undefined) {
    return _defineProperty({}, property, LENGTH(value));
  }
  if (FONT_WEIGHT(value) !== undefined) {
    return _defineProperty({}, property, FONT_WEIGHT(value));
  }
  var boolMatch = value.match(boolRe);
  if (boolMatch) {
    return _defineProperty({}, property, boolMatch[0].toLowerCase() === "true");
  }
  var nullMatch = value.match(nullRe);
  if (nullMatch) {
    return _defineProperty({}, property, null);
  }
  var undefinedMatch = value.match(undefinedRe);
  if (undefinedMatch) {
    return _defineProperty({}, property, undefined);
  }
  return _defineProperty({}, property, value);
}