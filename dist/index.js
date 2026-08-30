"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "GroupContext", {
  enumerable: true,
  get: function get() {
    return _interop.GroupContext;
  }
});
Object.defineProperty(exports, "InheritContext", {
  enumerable: true,
  get: function get() {
    return _interop.InheritContext;
  }
});
Object.defineProperty(exports, "Runtime", {
  enumerable: true,
  get: function get() {
    return _transformerRuntime["default"];
  }
});
Object.defineProperty(exports, "Stylesheet", {
  enumerable: true,
  get: function get() {
    return _stylesheet["default"];
  }
});
Object.defineProperty(exports, "cssInterop", {
  enumerable: true,
  get: function get() {
    return _interop.cssInterop;
  }
});
exports["default"] = void 0;
Object.defineProperty(exports, "getGlobalStylesheet", {
  enumerable: true,
  get: function get() {
    return _interop.getGlobalStylesheet;
  }
});
Object.defineProperty(exports, "getStylesheet", {
  enumerable: true,
  get: function get() {
    return _transformer.getStylesheet;
  }
});
Object.defineProperty(exports, "remapProps", {
  enumerable: true,
  get: function get() {
    return _interop.remapProps;
  }
});
Object.defineProperty(exports, "setGlobalStylesheet", {
  enumerable: true,
  get: function get() {
    return _interop.setGlobalStylesheet;
  }
});
Object.defineProperty(exports, "transform", {
  enumerable: true,
  get: function get() {
    return _transformer.transform;
  }
});
Object.defineProperty(exports, "writeStylesheetJSON", {
  enumerable: true,
  get: function get() {
    return _transformer.writeStylesheetJSON;
  }
});
var _interop = require("./interop");
var _transformerRuntime = _interopRequireDefault(require("./transformer-runtime"));
var _stylesheet = _interopRequireDefault(require("./features/stylesheet"));
var _transformer = require("./transformer");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
var _default = exports["default"] = {
  cssInterop: _interop.cssInterop,
  remapProps: _interop.remapProps,
  setGlobalStylesheet: _interop.setGlobalStylesheet,
  getGlobalStylesheet: _interop.getGlobalStylesheet,
  GroupContext: _interop.GroupContext,
  InheritContext: _interop.InheritContext,
  Runtime: _transformerRuntime["default"],
  Stylesheet: _stylesheet["default"],
  getStylesheet: _transformer.getStylesheet,
  transform: _transformer.transform,
  writeStylesheetJSON: _transformer.writeStylesheetJSON
};