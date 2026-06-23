import fs from "fs";
import path from "path";
import { parse as cssParse } from "css";
import Stylesheet from "./features/stylesheet";
import { preprocessTailwindCss } from "./utils/css";

function getStylesheet(css) {
  const preprocessedCss = preprocessTailwindCss(css);
  const ast = cssParse(preprocessedCss);

  const stylesheet = new Stylesheet();

  for (const rule of ast.stylesheet.rules || []) {
    if (!stylesheet.isRuleTypeSupported(rule.type)) continue;
    if (rule.type === "rule") {
      const declarations = stylesheet.simplifyDeclarations(rule.declarations);

      rule.selectors.forEach((selector) => {
        if (!stylesheet.isSelectorSupported(selector)) return;
        stylesheet.upsert(selector, declarations);
      });
    }
  }

  // all @media will be injected at the end
  for (const rule of ast.stylesheet.rules || []) {
    if (!stylesheet.isRuleTypeSupported(rule.type)) continue;
    if (rule.type === "media") {
      for (const mediaRule of rule.rules || []) {
        if (!stylesheet.isRuleTypeSupported(mediaRule.type)) continue;
        if (mediaRule.type === "rule") {
          const declarations = stylesheet.simplifyDeclarations(
            mediaRule.declarations,
          );

          mediaRule.selectors.forEach((selector) => {
            if (!stylesheet.isSelectorSupported(selector)) return;
            stylesheet.upsert(selector, {
              [`@media ${rule.media}`]: declarations,
            });
          });
        }
      }
    }
  }

  if (process.env.NODE_ENV !== "production") {
    debugStylesheets(stylesheet.toJSON());
  }

  return stylesheet.toJSON();
}

function debugStylesheets(content) {
  try {
    const dir = path.join(__dirname);
    fs.writeFileSync(`${dir}/exported-stylesheet.json`, content, {
      mode: 0o755,
    });
  } catch {}
}

module.exports.transform = function ({ src, filename, options }) {
  const projectRoot =
    options && options.projectRoot ? options.projectRoot : process.cwd();

  const upstreamTransformer = (() => {
    const resolveOptions = { paths: [projectRoot] };
    try {
      return require(
        require.resolve("@expo/metro-config/babel-transformer", resolveOptions),
      );
    } catch (error) {
      try {
        return require(
          require.resolve(
            "@react-native/metro-babel-transformer",
            resolveOptions,
          ),
        );
      } catch (error) {
        try {
          return require(
            require.resolve(
              "metro-react-native-babel-transformer",
              resolveOptions,
            ),
          );
        } catch (err) {
          // Fallback to normal require in case of non-standard setups
          try {
            return require("@expo/metro-config/babel-transformer");
          } catch (e) {
            try {
              return require("@react-native/metro-babel-transformer");
            } catch (e2) {
              return require("metro-react-native-babel-transformer");
            }
          }
        }
      }
    }
  })();

  if (filename.endsWith(".css")) {
    return upstreamTransformer.transform({
      src: `module.exports = ${getStylesheet(src)}`,
      filename,
      options,
    });
  }
  return upstreamTransformer.transform({ src, filename, options });
};
