"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = CssCalc;
var _helper = require("../utils/helper");
var calcRe = /calc\(([^)]+)\)/g;
var colorRe1 = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+)\s*)?\)/g;
var colorRe2 = /rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)/g;
function CssCalc() {
  // TODO: move to runtime calc
  this.calc = function (value) {
    if (value === undefined) return value;
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
    if (value === undefined) return value;
    value = value.replace(colorRe1, function (_, r, g, b, a) {
      a = parseFloat(a);
      if (isNaN(a) || a >= 1) return "#".concat((0, _helper.itohex)(r)).concat((0, _helper.itohex)(g)).concat((0, _helper.itohex)(b));
      a = Math.round(a * 255);
      return "#".concat((0, _helper.itohex)(r)).concat((0, _helper.itohex)(g)).concat((0, _helper.itohex)(b)).concat((0, _helper.itohex)(a));
    });
    value = value.replace(colorRe2, function (_, r, g, b, a) {
      a = parseFloat(a);
      if (isNaN(a) || a >= 1) return "#".concat((0, _helper.itohex)(r)).concat((0, _helper.itohex)(g)).concat((0, _helper.itohex)(b));
      a = Math.round(a * 255);
      return "#".concat((0, _helper.itohex)(r)).concat((0, _helper.itohex)(g)).concat((0, _helper.itohex)(b)).concat((0, _helper.itohex)(a));
    });
    return value;
  };
  return this;
}