"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = _default;
var _path = _interopRequireDefault(require("path"));
var _generator = _interopRequireDefault(require("@babel/generator"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
var libRoot = _path["default"].dirname(__filename);
function isRequire(node) {
  var _node$declarations;
  return (node === null || node === void 0 || (_node$declarations = node.declarations) === null || _node$declarations === void 0 || (_node$declarations = _node$declarations[0]) === null || _node$declarations === void 0 || (_node$declarations = _node$declarations.init) === null || _node$declarations === void 0 || (_node$declarations = _node$declarations.callee) === null || _node$declarations === void 0 ? void 0 : _node$declarations.name) === "require";
}
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
          var regex = options.paths.map(function (p) {
            return new RegExp(p);
          });
          var excludesRegex = options.excludes.map(function (p) {
            return new RegExp(p);
          });
          if (!regex.some(function (re) {
            return filename.match(re);
          }) || excludesRegex.some(function (re) {
            return filename.match(re);
          })) {
            return;
          }
          state.enabled = true;
          state.stylesheetId = path.scope.generateUidIdentifier();
          state.stylesheet = t.variableDeclaration("var", [t.variableDeclarator(state.stylesheetId, t.callExpression(t.identifier("require"), [t.stringLiteral(options.css)]))]);
          state.getStyleId = path.scope.generateUidIdentifier();
          state.getStyle = t.variableDeclaration("var", [t.variableDeclarator(state.getStyleId, t.memberExpression(t.memberExpression(t.callExpression(t.identifier("require"), [t.stringLiteral(_path["default"].join(libRoot, "./transformer-runtime"))]), t.identifier("default")), t.identifier("getStyle")))]);
        },
        exit: function exit(path, state) {
          if (!state.enabled) return;
          if (!state.cssTransformed) return;
          var lastImport = path.get("body").filter(function (p) {
            return p.isImportDeclaration() || isRequire(p.node);
          }).pop();
          [state.stylesheet, state.getStyle].reverse().forEach(function (node) {
            return lastImport ? lastImport.insertAfter(node) : path.unshiftContainer("body", node);
          });
        }
      },
      JSXElement: function JSXElement(path, state) {
        if (!state.enabled) return;
        var openingElement = path.node.openingElement;
        var propInheritStyle = t.logicalExpression("&&", t.memberExpression(t.identifier("arguments"), t.numericLiteral(0), true), t.memberExpression(t.memberExpression(t.identifier("arguments"), t.numericLiteral(0), true), t.identifier("inheritStyle")));
        var inheritStyle = openingElement.attributes.find(function (attr) {
          var _attr$name;
          return ((_attr$name = attr.name) === null || _attr$name === void 0 ? void 0 : _attr$name.name) === "inheritStyle";
        });
        var className = openingElement.attributes.find(function (attr) {
          var _attr$name2;
          return ((_attr$name2 = attr.name) === null || _attr$name2 === void 0 ? void 0 : _attr$name2.name) === "className";
        });
        var style = openingElement.attributes.find(function (attr) {
          var _attr$name3;
          return ((_attr$name3 = attr.name) === null || _attr$name3 === void 0 ? void 0 : _attr$name3.name) === "style";
        });
        if (!inheritStyle && !className && !style) return;
        state.cssTransformed = true;

        // compute style and inheritStyle
        var styleExpressions = t.callExpression(state.getStyleId, [state.stylesheetId, t.arrayExpression([t.arrayExpression([propInheritStyle, inheritStyle && inheritStyle.value.expression || null]), className && (t.isStringLiteral(className.value) ? t.stringLiteral(className.value.value) : className.value.expression) || null, style && style.value.expression || null])]);

        // inject style and inheritStyle attributes
        if (style) {
          style.value = styleExpressions;
        } else {
          openingElement.attributes.push(t.jsxAttribute(t.jsxIdentifier("style"), t.jsxExpressionContainer(styleExpressions)));
        }
        if (inheritStyle) {
          inheritStyle.value = styleExpressions;
        } else {
          openingElement.attributes.push(t.jsxAttribute(t.jsxIdentifier("inheritStyle"), t.jsxExpressionContainer(styleExpressions)));
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
            childOpeningElement.attributes.push(t.jsxAttribute(t.jsxIdentifier("inheritStyle"), t.jsxExpressionContainer(styleExpressions)));

            // Skip traversing nested JSXOpeningElement nodes
            childPath.skip();
          }
        });
      }
    }
  };
}