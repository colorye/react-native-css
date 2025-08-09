import nodePath from "path";
import { isImportOrRequire, isFragmentElement, getStyleExpression } from "./utils/babel.js";

const libRoot = nodePath.dirname(__filename);

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

          // Normalize filename to use forward slashes for consistent regex matching across platforms
          const normalizedFilename = filename.replace(/\\/g, "/");
          const regex = options.paths.map((p) => new RegExp(p));
          const excludesRegex = options.excludes.map((p) => new RegExp(p));
          if (
            !regex.some((re) => normalizedFilename.match(re) || filename.match(re)) ||
            excludesRegex.some((re) => normalizedFilename.match(re) || filename.match(re))
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

          state.getInheritStyleId = path.scope.generateUidIdentifier();
          state.getInheritStyle = t.variableDeclaration("var", [
            t.variableDeclarator(
              state.getInheritStyleId,
              t.memberExpression(
                t.memberExpression(
                  t.callExpression(t.identifier("require"), [
                    t.stringLiteral(nodePath.join(libRoot, "./transformer-runtime")),
                  ]),
                  t.identifier("default"),
                ),
                t.identifier("getInheritStyle"),
              ),
            ),
          ]);
        },
        exit(path, state) {
          if (!state.enabled) return;
          const lastImport = path
            .get("body")
            .filter((p) => isImportOrRequire(p))
            .pop();

          [state.stylesheet, state.getStyle, state.getInheritStyle]
            .reverse()
            .forEach((node) =>
              lastImport ? lastImport.insertAfter(node) : path.unshiftContainer("body", node),
            );
        },
      },
      JSXElement(path, state) {
        if (!state.enabled) return;

        if (isFragmentElement(t, path.node.openingElement.name)) return;

        const openingElement = path.node.openingElement;

        // inject style attribute
        const style = openingElement.attributes.find((attr) => attr.name?.name === "style");
        const styleExpressions = getStyleExpression(path, state, t);
        if (style) {
          style.value = t.jsxExpressionContainer(styleExpressions);
        } else {
          openingElement.attributes.push(
            t.jsxAttribute(t.jsxIdentifier("style"), t.jsxExpressionContainer(styleExpressions)),
          );
        }

        // inject inheritStyle attribute
        const inheritStyle = openingElement.attributes.find(
          (attr) => attr.name?.name === "inheritStyle",
        );
        const inheritStyleExpressions = t.callExpression(state.getInheritStyleId, [
          styleExpressions,
        ]);
        if (inheritStyle) {
          inheritStyle.value = t.jsxExpressionContainer(inheritStyleExpressions);
        } else {
          openingElement.attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier("inheritStyle"),
              t.jsxExpressionContainer(inheritStyleExpressions),
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

            // TODO: what if there are multiple direct children?

            // TODO: go to next child if direct child is a fragment
            if (isFragmentElement(t, childOpeningElement.name)) {
              childPath.skip();
              return;
            }

            const inheritStyle = childOpeningElement.attributes.find(
              (attr) => attr.name?.name === "inheritStyle",
            );
            if (inheritStyle) {
              inheritStyle.value = t.jsxExpressionContainer(inheritStyleExpressions);
            } else {
              childOpeningElement.attributes.push(
                t.jsxAttribute(
                  t.jsxIdentifier("inheritStyle"),
                  t.jsxExpressionContainer(inheritStyleExpressions),
                ),
              );
            }

            // Skip traversing nested JSXOpeningElement nodes
            childPath.skip();
          },
        });
      },
    },
  };
}
