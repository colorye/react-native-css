"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = CssMedia;
var _helper = require("../utils/helper");
var _cssTransform = _interopRequireDefault(require("./css-transform"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
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