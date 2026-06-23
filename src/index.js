import fs from "fs";
import path from "path";
import { parse as cssParse } from "css";
import Stylesheet from "./features/stylesheet";
import { preprocessTailwindCss } from "./utils/css";

function getStylesheet(css, filename) {
  // 1. Run Tailwind CSS v4 preprocessing (supports oklch, @layer flattening, etc.)
  const preprocessedCss = preprocessTailwindCss(css);
  const ast = cssParse(preprocessedCss);
  const stylesheet = new Stylesheet();

  // Process regular rules
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

  // Process @media rules (injected at the end)
  for (const rule of ast.stylesheet.rules || []) {
    if (!stylesheet.isRuleTypeSupported(rule.type)) continue;
    if (rule.type === "media") {
      for (const mediaRule of rule.rules || []) {
        if (!stylesheet.isRuleTypeSupported(mediaRule.type)) continue;
        if (mediaRule.type === "rule") {
          const declarations = stylesheet.simplifyDeclarations(mediaRule.declarations);

          mediaRule.selectors.forEach((selector) => {
            if (!stylesheet.isSelectorSupported(selector)) return;
            stylesheet.upsert(selector, { [`@media ${rule.media}`]: declarations });
          });
        }
      }
    }
  }

  const jsonContent = stylesheet.toJSON();

  // Always write the pre-computed stylesheet for Babel to read
  writeStylesheetJSON(jsonContent, filename);

  return jsonContent;
}

function writeStylesheetJSON(content, filename) {
  try {
    // Write to lib directory (where dist will be)
    const libDir = path.join(__dirname);
    fs.writeFileSync(path.join(libDir, "exported-stylesheet.json"), content, { mode: 0o755 });

    // Also write next to the source CSS file for easier debugging
    if (filename) {
      fs.writeFileSync(`${filename}.json`, content, { mode: 0o755 });
    }
  } catch {
    // Silently fail - Babel will fall back to runtime
  }
}

module.exports.transform = function ({ src, filename, options }) {
  const projectRoot =
    options && options.projectRoot ? options.projectRoot : process.cwd();

  const resolveTransformer = (() => {
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
      } catch (error2) {
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
              try {
                return require("metro-react-native-babel-transformer");
              } catch (e3) {
                throw new Error(
                  "Failed to load any upstream babel-transformer. Please ensure either '@expo/metro-config', '@react-native/metro-babel-transformer', or 'metro-react-native-babel-transformer' is installed."
                );
              }
            }
          }
        }
      }
    }
  })();

  if (filename.endsWith(".css")) {
    return resolveTransformer.transform({
      src: `module.exports = ${getStylesheet(src, filename)}`,
      filename,
      options,
    });
  }
  return resolveTransformer.transform({ src, filename, options });
};
