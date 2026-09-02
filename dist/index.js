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
var _interop = require("./interop.js");
var _transformerRuntime = _interopRequireDefault(require("./transformer-runtime.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
var _default = exports["default"] = {
  cssInterop: _interop.cssInterop,
  remapProps: _interop.remapProps,
  setGlobalStylesheet: _interop.setGlobalStylesheet,
  getGlobalStylesheet: _interop.getGlobalStylesheet,
  GroupContext: _interop.GroupContext,
  InheritContext: _interop.InheritContext,
  Runtime: _transformerRuntime["default"]
};