import nodePath from "path";
import generate from "@babel/generator";

const libRoot = nodePath.dirname(__filename);

function isRequire(node) {
  return node?.declarations?.[0]?.init?.callee?.name === "require";
}

export default function ({ types: t }) {
  return {
    name: "@colorye/react-native-css",
    visitor: {
      Program: {
        enter(path, state) {
          if (!this.opts.css) {
            console.warn("No css file provided");
            return;
          }

          const { filename } = state.file.opts;
          const options = {
            paths: this.opts.paths || [],
            excludes: this.opts.excludes || [],
            css: this.opts.css,
          };

          const regex = options.paths.map((p) => new RegExp(p));
          const excludesRegex = options.excludes.map((p) => new RegExp(p));
          if (
            !regex.some((re) => filename.match(re)) ||
            excludesRegex.some((re) => filename.match(re))
          ) {
            return;
          }

          state.enabled = true;

          state.stylesheetId = path.scope.generateUidIdentifier();
          state.stylesheet = t.variableDeclaration("var", [
            t.variableDeclarator(
              state.stylesheetId,
              t.callExpression(t.identifier("require"), [t.stringLiteral(options.css)]),
            ),
          ]);

          state.getStyleId = path.scope.generateUidIdentifier();
          state.getStyle = t.variableDeclaration("var", [
            t.variableDeclarator(
              state.getStyleId,
              t.memberExpression(
                t.memberExpression(
                  t.callExpression(t.identifier("require"), [
                    t.stringLiteral(nodePath.join(libRoot, "./transformer-runtime")),
                  ]),
                  t.identifier("default"),
                ),
                t.identifier("getStyle"),
              ),
            ),
          ]);
        },
        exit(path, state) {
          if (!state.enabled) return;
          if (!state.cssTransformed) return;

          const lastImport = path
            .get("body")
            .filter((p) => p.isImportDeclaration() || isRequire(p.node))
            .pop();

          [state.stylesheet, state.getStyle]
            .reverse()
            .forEach((node) =>
              lastImport ? lastImport.insertAfter(node) : path.unshiftContainer("body", node),
            );
        },
      },
      JSXElement(path, state) {
        if (!state.enabled) return;
        const openingElement = path.node.openingElement;

        const propInheritStyle = t.logicalExpression(
          "&&",
          t.memberExpression(t.identifier("arguments"), t.numericLiteral(0), true),
          t.memberExpression(
            t.memberExpression(t.identifier("arguments"), t.numericLiteral(0), true),
            t.identifier("inheritStyle"),
          ),
        );

        const inheritStyle = openingElement.attributes.find(
          (attr) => attr.name?.name === "inheritStyle",
        );
        const className = openingElement.attributes.find((attr) => attr.name?.name === "className");
        const style = openingElement.attributes.find((attr) => attr.name?.name === "style");
        if (!inheritStyle && !className && !style) return;

        state.cssTransformed = true;

        // compute style and inheritStyle
        const styleExpressions = t.callExpression(state.getStyleId, [
          state.stylesheetId,
          t.arrayExpression([
            t.arrayExpression([
              propInheritStyle,
              (inheritStyle && inheritStyle.value.expression) || null,
            ]),
            (className &&
              (t.isStringLiteral(className.value)
                ? t.stringLiteral(className.value.value)
                : className.value.expression)) ||
              null,
            (style && style.value.expression) || null,
          ]),
        ]);

        // inject style and inheritStyle attributes
        if (style) {
          style.value = styleExpressions;
        } else {
          openingElement.attributes.push(
            t.jsxAttribute(t.jsxIdentifier("style"), t.jsxExpressionContainer(styleExpressions)),
          );
        }

        if (inheritStyle) {
          inheritStyle.value = styleExpressions;
        } else {
          openingElement.attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier("inheritStyle"),
              t.jsxExpressionContainer(styleExpressions),
            ),
          );
        }

        // remove className attribute
        for (let i = openingElement.attributes.length - 1; i >= 0; i--) {
          if (["className"].includes(openingElement.attributes[i].name?.name)) {
            openingElement.attributes.splice(i, 1);
          }
        }

        // inject inheritStyle attribute to first nested JSXElements
        path.traverse({
          JSXElement(childPath) {
            const childOpeningElement = childPath.node.openingElement;
            childOpeningElement.attributes.push(
              t.jsxAttribute(
                t.jsxIdentifier("inheritStyle"),
                t.jsxExpressionContainer(styleExpressions),
              ),
            );

            // Skip traversing nested JSXOpeningElement nodes
            childPath.skip();
          },
        });
      },
    },
  };
}
