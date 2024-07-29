"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.camelize = camelize;
exports.iife = iife;
exports.itohex = itohex;
exports.rgbtohex = rgbtohex;
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i["return"] && (_r = _i["return"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
function camelize(str) {
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, function (_, chr) {
    return chr.toUpperCase();
  });
}
function iife(func) {
  return typeof func === "function" && func();
}
function itohex(component) {
  var hex = Number(component).toString(16);
  return hex.length === 1 ? "0".concat(hex) : hex;
}
function rgbtohex(color) {
  function itohex(component) {
    var hex = component.toString(16);
    return hex.length === 1 ? "0".concat(hex) : hex;
  }

  // Regular expression patterns to match rgb, rgba, and modern rgb/rgba color values
  var rgbPattern = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/;
  var rgbaPattern = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/;
  var modernRgbPattern = /rgb\((\d+)\s+(\d+)\s+(\d+)\/([\d.]+)\)/;
  var modernRgbaPattern = /rgba\((\d+)\s+(\d+)\s+(\d+)\/([\d.]+)\)/;
  var red, green, blue, alpha;
  // Check if the color is in the rgb format
  if (rgbPattern.test(color)) {
    var _rgbPattern$exec = rgbPattern.exec(color);
    var _rgbPattern$exec2 = _slicedToArray(_rgbPattern$exec, 4);
    red = _rgbPattern$exec2[1];
    green = _rgbPattern$exec2[2];
    blue = _rgbPattern$exec2[3];
  }

  // Check if the color is in the rgba format
  if (rgbaPattern.test(color)) {
    var _rgbaPattern$exec = rgbaPattern.exec(color);
    var _rgbaPattern$exec2 = _slicedToArray(_rgbaPattern$exec, 5);
    red = _rgbaPattern$exec2[1];
    green = _rgbaPattern$exec2[2];
    blue = _rgbaPattern$exec2[3];
    alpha = _rgbaPattern$exec2[4];
    alpha = parseFloat(alpha);
  }

  // Check if the color is in the modern rgb format
  if (modernRgbPattern.test(color)) {
    var _modernRgbPattern$exe = modernRgbPattern.exec(color);
    var _modernRgbPattern$exe2 = _slicedToArray(_modernRgbPattern$exe, 5);
    red = _modernRgbPattern$exe2[1];
    green = _modernRgbPattern$exe2[2];
    blue = _modernRgbPattern$exe2[3];
    alpha = _modernRgbPattern$exe2[4];
    alpha = parseFloat(alpha);
  }

  // Check if the color is in the modern rgba format
  if (modernRgbaPattern.test(color)) {
    var _modernRgbaPattern$ex = modernRgbaPattern.exec(color);
    var _modernRgbaPattern$ex2 = _slicedToArray(_modernRgbaPattern$ex, 5);
    red = _modernRgbaPattern$ex2[1];
    green = _modernRgbaPattern$ex2[2];
    blue = _modernRgbaPattern$ex2[3];
    alpha = _modernRgbaPattern$ex2[4];
    alpha = parseFloat(alpha);
  }

  // Invalid color format, return the original color
  if (!red || !green || !blue) {
    return color;
  }
  if (alpha === 1 || isNaN(alpha)) {
    return "#".concat(itohex(parseInt(red))).concat(itohex(parseInt(green))).concat(itohex(parseInt(blue)));
  }
  var hexOpacity = itohex(Math.round(alpha * 255));
  return "#".concat(itohex(parseInt(red))).concat(itohex(parseInt(green))).concat(itohex(parseInt(blue))).concat(hexOpacity);
}