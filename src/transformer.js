import fs from "fs";
import path from "path";
import Stylesheet from "./features/stylesheet";
import { parseStylesheetWithLightning } from "./utils/css";

export function getStylesheet(css, filename) {
  const rawStylesheet = parseStylesheetWithLightning(css);
  const stylesheet = new Stylesheet();
  stylesheet.setRawStylesheet(rawStylesheet);

  const jsonContent = stylesheet.toJSON();
  writeStylesheetJSON(jsonContent, filename);

  return jsonContent;
}

export function writeStylesheetJSON(content, filename) {
  try {
    const distPath = path.join(__dirname, "exported-stylesheet.json");
    fs.writeFileSync(distPath, content, { mode: 0o755 });

    const srcPath = path.resolve(__dirname, "../src/exported-stylesheet.json");
    if (fs.existsSync(path.dirname(srcPath))) {
      fs.writeFileSync(srcPath, content, { mode: 0o755 });
    }

    if (filename) {
      fs.writeFileSync(`${filename}.json`, content, { mode: 0o755 });
    }
  } catch {
    // Silently fail - Babel will fall back to runtime
  }
}

export function transform({ src, filename, options }) {
  const projectRoot = options && options.projectRoot ? options.projectRoot : process.cwd();

  const resolveTransformer = (() => {
    try {
      return require("@expo/metro-config/babel-transformer");
    } catch {
      try {
        return require("@react-native/metro-babel-transformer");
      } catch {
        try {
          return require("metro-react-native-babel-transformer");
        } catch {
          const resolveOptions = { paths: [projectRoot] };
          try {
            const resolved = require.resolve("@expo/metro-config/babel-transformer", resolveOptions);
            return eval("require")(resolved);
          } catch {
            try {
              const resolved = require.resolve("@react-native/metro-babel-transformer", resolveOptions);
              return eval("require")(resolved);
            } catch {
              try {
                const resolved = require.resolve("metro-react-native-babel-transformer", resolveOptions);
                return eval("require")(resolved);
              } catch {
                throw new Error(
                  "Failed to load any upstream babel-transformer. Please ensure either '@expo/metro-config', '@react-native/metro-babel-transformer', or 'metro-react-native-babel-transformer' is installed.",
                );
              }
            }
          }
        }
      }
    }
  })();

  if (filename.endsWith(".css")) {
    const jsonContent = getStylesheet(src, filename);
    return resolveTransformer.transform({
      src: `const sheet = ${jsonContent};\nmodule.exports = sheet;\nmodule.exports.default = sheet;\nmodule.exports.__esModule = true;`,
      filename,
      options,
    });
  }
  return resolveTransformer.transform({ src, filename, options });
}

export default {
  transform,
  getStylesheet,
  writeStylesheetJSON,
};
