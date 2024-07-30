import nodePath from "path";
import { PluginObj, types as t, Visitor } from "@babel/core";

interface PluginState {
  opts: {
    css: string;
    paths: string[];
    excludes: string[];
  };
  file: {
    opts: {
      filename: string;
    };
  };
  enabled: boolean;
  stylesheetId: t.Identifier;
  stylesheet: t.VariableDeclaration;
  getStyleId: t.Identifier;
  getStyle: t.VariableDeclaration;
  cssTransformed: boolean;
}

const libRoot = nodePath.dirname(__filename);

const visitor: Visitor<PluginState> = {
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
          t.callExpression(t.identifier("require"), [
            t.stringLiteral(options.css),
          ]),
        ),
      ]);

      state.getStyleId = path.scope.generateUidIdentifier();
      state.getStyle = t.variableDeclaration("var", [
        t.variableDeclarator(
          state.getStyleId,
          t.memberExpression(
            t.memberExpression(
              t.callExpression(t.identifier("require"), [
                t.stringLiteral(
                  nodePath.join(libRoot, "./transformer-runtime"),
                ),
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
        .filter(
          (p) =>
            p.isImportDeclaration() ||
            (p.isVariableDeclaration() &&
              t.isCallExpression(p.node.declarations[0]?.init) &&
              (p.node.declarations[0].init.callee as { name: string }).name ===
                "require"),
        )
        .pop();

      [state.stylesheet, state.getStyle]
        .reverse()
        .forEach((node) =>
          lastImport
            ? lastImport.insertAfter(node)
            : path.unshiftContainer("body", node),
        );
    },
  },
  JSXElement(path, state) {
    if (!state.enabled) return;
    const attributes = path.node.openingElement.attributes.filter(
      (attr) => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name),
    ) as t.JSXAttribute[];

    const propInheritStyle = t.logicalExpression(
      "&&",
      t.memberExpression(t.identifier("arguments"), t.numericLiteral(0), true),
      t.memberExpression(
        t.memberExpression(
          t.identifier("arguments"),
          t.numericLiteral(0),
          true,
        ),
        t.identifier("inheritStyle"),
      ),
    );

    const inheritStyle = attributes.find(
      (attr) => attr.name.name === "inheritStyle",
    );
    const className = attributes.find((attr) => attr.name.name === "className");
    const style = attributes.find((attr) => attr.name.name === "style");
    if (!inheritStyle && !className && !style) return;

    state.cssTransformed = true;

    // compute style and inheritStyle
    const styleExpressions = t.callExpression(state.getStyleId, [
      state.stylesheetId,
      t.arrayExpression([
        t.arrayExpression([
          propInheritStyle,
          (t.isJSXExpressionContainer(inheritStyle?.value) &&
            !t.isJSXEmptyExpression(inheritStyle.value.expression) &&
            inheritStyle.value.expression) ||
            null,
        ]),
        (className &&
          (t.isStringLiteral(className.value)
            ? t.stringLiteral(className.value.value)
            : t.isJSXExpressionContainer(className?.value) &&
              !t.isJSXEmptyExpression(className.value.expression) &&
              className.value.expression)) ||
          null,
        (t.isJSXExpressionContainer(style?.value) &&
          !t.isJSXEmptyExpression(style.value.expression) &&
          style.value.expression) ||
          null,
      ]),
    ]);

    // inject style and inheritStyle attributes
    if (style) {
      style.value = t.jsxExpressionContainer(styleExpressions);
    } else {
      attributes.push(
        t.jsxAttribute(
          t.jsxIdentifier("style"),
          t.jsxExpressionContainer(styleExpressions),
        ),
      );
    }

    if (inheritStyle) {
      inheritStyle.value = t.jsxExpressionContainer(styleExpressions);
    } else {
      attributes.push(
        t.jsxAttribute(
          t.jsxIdentifier("inheritStyle"),
          t.jsxExpressionContainer(styleExpressions),
        ),
      );
    }

    // remove className attribute
    for (let i = attributes.length - 1; i >= 0; i--) {
      if (["className"].includes(attributes[i].name?.name as string)) {
        attributes.splice(i, 1);
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
};

export default function (): PluginObj<PluginState> {
  return {
    name: "@colorye/react-native-css",
    visitor,
  };
}
