"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = CssMedia;
var _helper = require("../utils/helper");
var _cssTransform = _interopRequireDefault(require("./css-transform"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i["return"] && (_r = _i["return"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
var SUPPORTED_MEDIA_TYPE = ["min-width", "min-height", "max-width", "max-height", "prefers-color-scheme"];
function CssMedia() {
  var transform = new _cssTransform["default"]();
  this.match = function (media) {
    var _media$match;
    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      width = _ref.width,
      height = _ref.height,
      colorScheme = _ref.colorScheme;
    var isMedia = media.startsWith("@media");
    if (!isMedia) return [false];
    var isValidMedia = true;
    var widthRange = [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
    var heightRange = [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
    var mediaGroupsRe = /\([^)]*\)/g;
    var mediaGroups = (_media$match = media.match(mediaGroupsRe)) === null || _media$match === void 0 ? void 0 : _media$match.map(function (rawGroup) {
      var mediaGroupRe = /\(\s*([^:)\s]+)\s*:\s*([^:)\s]+)\s*\)/g;
      var _ref2 = mediaGroupRe.exec(rawGroup) || [],
        _ref3 = _slicedToArray(_ref2, 3),
        mediaType = _ref3[1],
        mediaValue = _ref3[2];
      if (!SUPPORTED_MEDIA_TYPE.includes(mediaType)) {
        isValidMedia = false;
        return null;
      }
      mediaType = (0, _helper.camelize)(mediaType);
      mediaValue = transform.transformUnsupportedUnit(mediaValue);
      mediaValue = transform.transformViewportUnit(mediaValue, {
        width: width,
        height: height
      });
      mediaValue = transform.removeUnit(mediaValue);
      if (mediaType === "minWidth") {
        widthRange[0] = mediaValue;
      } else if (mediaType === "minHeight") {
        heightRange[0] = mediaValue;
      } else if (mediaType === "maxWidth") {
        widthRange[1] = mediaValue;
      } else if (mediaType === "maxHeight") {
        heightRange[1] = mediaValue;
      }
      return [mediaType, mediaValue];
    });
    if (!Array.isArray(mediaGroups) || mediaGroups.length === 0) {
      isValidMedia = false;
    }
    if (!isValidMedia) return [true, false];
    if (mediaGroups[0][0] === "prefersColorScheme" && mediaGroups[0][1] === "dark") {
      if (colorScheme === "dark") {
        return [true, true];
      } else {
        return [true, false];
      }
    }
    var isValidRange = widthRange[0] <= widthRange[1] && heightRange[0] <= heightRange[1];
    if (!isValidRange) return [true, false];
    var isMatchedMedia = widthRange[0] <= width && width <= widthRange[1] && heightRange[0] <= height && height <= heightRange[1];
    if (!isMatchedMedia) return [true, false];
    return [true, true];
  };
  return this;
}