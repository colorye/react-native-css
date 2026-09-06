import fs from "fs";
import path from "path";

let native = null;
try {
  native = require("./native");
} catch {
  try {
    native = require("../crates/transformer");
  } catch {}
}

let cachedStylesheet = null;

function getCachedStylesheetJson(projectRoot) {
  if (cachedStylesheet) return cachedStylesheet;
  try {
    const root = projectRoot || process.cwd();
    const candidates = [
      path.resolve(root, "index.css.json"),
      path.resolve(root, "src/assets/styles/index.css.json"),
      path.join(__dirname, "exported-stylesheet.json"),
      path.resolve(__dirname, "../src/exported-stylesheet.json"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        cachedStylesheet = fs.readFileSync(p, "utf-8");
        return cachedStylesheet;
      }
    }
  } catch {}
  return "{}";
}

export function getStylesheet(css, filename) {
  if (!native || !native.compileCss) {
    throw new Error(
      "[@colorye/react-native-css] Native Rust transformer binding is not loaded. Cannot compile CSS.",
    );
  }

  const jsonContent = native.compileCss(css);
  cachedStylesheet = jsonContent;
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
                return null;
              }
            }
          }
        }
      }
    }
  })();

  if (filename.endsWith(".css")) {
    const jsonContent = getStylesheet(src, filename);
    const cssCode = `const sheet = ${jsonContent};\nmodule.exports = sheet;\nmodule.exports.default = sheet;\nmodule.exports.__esModule = true;`;
    if (resolveTransformer && resolveTransformer.transform) {
      return resolveTransformer.transform({
        src: cssCode,
        filename,
        options,
      });
    }
    return { code: cssCode, map: null };
  }

  // Fast native Rust SWC transformer for JSX/TSX
  if (
    native &&
    native.transformJsx &&
    (filename.endsWith(".tsx") || filename.endsWith(".jsx")) &&
    !filename.includes("node_modules")
  ) {
    try {
      const stylesheetJson = options?.stylesheetJson || getCachedStylesheetJson(projectRoot);
      const res = native.transformJsx(src, {
        filename,
        stylesheetJson,
        sourceMaps: true,
      });
      if (res && res.code) {
        src = res.code;
      }
    } catch {
      // Graceful fallback to Babel if native transform hits unexpected syntax
    }
  }

  if (resolveTransformer && resolveTransformer.transform) {
    return resolveTransformer.transform({ src, filename, options });
  }
  return { code: src, map: null };
}

export default {
  transform,
  getStylesheet,
  writeStylesheetJSON,
};
