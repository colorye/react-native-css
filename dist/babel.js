"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = _default;
var _path = _interopRequireDefault(require("path"));
var _babel = require("./utils/babel.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
var libRoot = _path["default"].dirname(__filename);
function _default(_ref) {
  var t = _ref.types;
  return {
    name: "@colorye/react-native-css",
    visitor: {
      Program: {
        enter: function enter(path, state) {
          if (!this.opts.css) {
            console.warn("No css file provided");
            return;
          }
          var filename = state.file.opts.filename;
          var options = {
            paths: this.opts.paths || [],
            excludes: this.opts.excludes || [],
            css: this.opts.css
          };

          // Normalize filename to use forward slashes for consistent regex matching across platforms
          var normalizedFilename = filename.replace(/\\/g, "/");
          var regex = options.paths.map(function (p) {
            return new RegExp(p);
          });
          var excludesRegex = options.excludes.map(function (p) {
            return new RegExp(p);
          });
          if (!regex.some(function (re) {
            return normalizedFilename.match(re) || filename.match(re);
          }) || excludesRegex.some(function (re) {
            return normalizedFilename.match(re) || filename.match(re);
          })) {
            return;
          }
          state.enabled = true;
          state.stylesheetId = path.scope.generateUidIdentifier();
          state.stylesheet = t.variableDeclaration("var", [t.variableDeclarator(state.stylesheetId, t.callExpression(t.identifier("require"), [t.stringLiteral(options.css)]))]);
          state.getStyleId = path.scope.generateUidIdentifier();
          state.getStyle = t.variableDeclaration("var", [t.variableDeclarator(state.getStyleId, t.memberExpression(t.memberExpression(t.callExpression(t.identifier("require"), [t.stringLiteral(_path["default"].join(libRoot, "./transformer-runtime"))]), t.identifier("default")), t.identifier("getStyle")))]);
          state.getInheritStyleId = path.scope.generateUidIdentifier();
          state.getInheritStyle = t.variableDeclaration("var", [t.variableDeclarator(state.getInheritStyleId, t.memberExpression(t.memberExpression(t.callExpression(t.identifier("require"), [t.stringLiteral(_path["default"].join(libRoot, "./transformer-runtime"))]), t.identifier("default")), t.identifier("getInheritStyle")))]);
        },
        exit: function exit(path, state) {
          if (!state.enabled) return;
          var lastImport = path.get("body").filter(function (p) {
            return (0, _babel.isImportOrRequire)(p);
          }).pop();
          [state.stylesheet, state.getStyle, state.getInheritStyle].reverse().forEach(function (node) {
            return lastImport ? lastImport.insertAfter(node) : path.unshiftContainer("body", node);
          });
        }
      },
      JSXElement: function JSXElement(path, state) {
        if (!state.enabled) return;
        if ((0, _babel.isFragmentElement)(t, path.node.openingElement.name)) return;
        var openingElement = path.node.openingElement;

        // inject style attribute
        var style = openingElement.attributes.find(function (attr) {
          var _attr$name;
          return ((_attr$name = attr.name) === null || _attr$name === void 0 ? void 0 : _attr$name.name) === "style";
        });
        var styleExpressions = (0, _babel.getStyleExpression)(path, state, t);
        if (style) {
          style.value = t.jsxExpressionContainer(styleExpressions);
        } else {
          openingElement.attributes.push(t.jsxAttribute(t.jsxIdentifier("style"), t.jsxExpressionContainer(styleExpressions)));
        }

        // inject inheritStyle attribute
        var inheritStyle = openingElement.attributes.find(function (attr) {
          var _attr$name2;
          return ((_attr$name2 = attr.name) === null || _attr$name2 === void 0 ? void 0 : _attr$name2.name) === "inheritStyle";
        });
        var inheritStyleExpressions = t.callExpression(state.getInheritStyleId, [styleExpressions]);
        if (inheritStyle) {
          inheritStyle.value = t.jsxExpressionContainer(inheritStyleExpressions);
        } else {
          openingElement.attributes.push(t.jsxAttribute(t.jsxIdentifier("inheritStyle"), t.jsxExpressionContainer(inheritStyleExpressions)));
        }

        // remove className attribute
        for (var i = openingElement.attributes.length - 1; i >= 0; i--) {
          var _openingElement$attri;
          if (["className"].includes((_openingElement$attri = openingElement.attributes[i].name) === null || _openingElement$attri === void 0 ? void 0 : _openingElement$attri.name)) {
            openingElement.attributes.splice(i, 1);
          }
        }

        // inject inheritStyle attribute to first nested JSXElements
        path.traverse({
          JSXElement: function JSXElement(childPath) {
            var childOpeningElement = childPath.node.openingElement;

            // TODO: what if there are multiple direct children?

            // TODO: go to next child if direct child is a fragment
            if ((0, _babel.isFragmentElement)(t, childOpeningElement.name)) {
              childPath.skip();
              return;
            }
            var inheritStyle = childOpeningElement.attributes.find(function (attr) {
              var _attr$name3;
              return ((_attr$name3 = attr.name) === null || _attr$name3 === void 0 ? void 0 : _attr$name3.name) === "inheritStyle";
            });
            if (inheritStyle) {
              inheritStyle.value = t.jsxExpressionContainer(inheritStyleExpressions);
            } else {
              childOpeningElement.attributes.push(t.jsxAttribute(t.jsxIdentifier("inheritStyle"), t.jsxExpressionContainer(inheritStyleExpressions)));
            }

            // Skip traversing nested JSXOpeningElement nodes
            childPath.skip();
          }
        });
      }
    }
  };
}