"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = CssCalc;
var calcRe = /calc\(([^)]+)\)/g;
var colorRe1 = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+)\s*)?\)/g;
var colorRe2 = /rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)/g;
var itohex = function itohex(component) {
  var hex = Number(component).toString(16);
  return hex.length === 1 ? "0".concat(hex) : hex;
};
function CssCalc() {
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
      if (isNaN(a) || a >= 1) return "#".concat(itohex(r)).concat(itohex(g)).concat(itohex(b));
      a = Math.round(a * 255);
      return "#".concat(itohex(r)).concat(itohex(g)).concat(itohex(b)).concat(itohex(a));
    });
    value = value.replace(colorRe2, function (_, r, g, b, a) {
      a = parseFloat(a);
      if (isNaN(a) || a >= 1) return "#".concat(itohex(r)).concat(itohex(g)).concat(itohex(b));
      a = Math.round(a * 255);
      return "#".concat(itohex(r)).concat(itohex(g)).concat(itohex(b)).concat(itohex(a));
    });
    return value;
  };
  return this;
}