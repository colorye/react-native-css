import fs from "fs";
import nodePath from "path";
import { parseSync } from "@babel/core";

let native = null;
try {
  native = require("./native");
} catch {
  try {
    native = require("../crates/transformer");
  } catch {}
}

const libRoot = nodePath.dirname(__filename);
const stylesheetCache = new Map();

function loadStylesheet(cssPath, fileDir) {
  if (!cssPath) return "{}";
  if (stylesheetCache.has(cssPath)) {
    return stylesheetCache.get(cssPath);
  }

  try {
    const cwd = process.cwd();
    const cleanPath = cssPath.replace(/^@\//, "");

    const candidates = [
      nodePath.resolve(cwd, cleanPath),
      nodePath.resolve(cwd, cleanPath.endsWith(".json") ? cleanPath : `${cleanPath}.json`),
      fileDir ? nodePath.resolve(fileDir, cssPath) : null,
      nodePath.resolve(cwd, "index.css.json"),
      nodePath.resolve(cwd, "index.css"),
      nodePath.join(libRoot, "exported-stylesheet.json"),
    ].filter(Boolean);

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf-8");
        let sheetJson = content;
        if (p.endsWith(".css") && native && native.compileCss) {
          sheetJson = native.compileCss(content);
        }
        stylesheetCache.set(cssPath, sheetJson);
        return sheetJson;
      }
    }
  } catch {}

  return "{}";
}

export default function () {
  return {
    name: "@colorye/react-native-css",
    visitor: {
      Program: {
        enter(path, state) {
          const { filename } = state.file.opts;
          if (!filename || filename.includes("node_modules")) return;

          const options = {
            paths: this.opts?.paths || [],
            excludes: this.opts?.excludes || [],
            css: this.opts?.css,
          };

          const normalizedFilename = filename.replace(/\\/g, "/");
          const regex = options.paths.map((p) => new RegExp(p));
          const excludesRegex = options.excludes.map((p) => new RegExp(p));

          if (
            options.paths.length > 0 &&
            !regex.some((re) => normalizedFilename.match(re) || filename.match(re))
          ) {
            return;
          }
          if (excludesRegex.some((re) => normalizedFilename.match(re) || filename.match(re))) {
            return;
          }

          if (!native || !native.transformJsx) return;

          const stylesheetJson = loadStylesheet(
            options.css,
            filename ? nodePath.dirname(filename) : null,
          );
          const rawCode = state.file.code;

          try {
            const res = native.transformJsx(rawCode, {
              filename,
              stylesheetJson,
              sourceMaps: false,
            });

            if (res && res.code && res.code !== rawCode) {
              const newAst = parseSync(res.code, {
                filename,
                parserOpts: {
                  plugins: ["jsx", "typescript"],
                },
                configFile: false,
                babelrc: false,
              });

              if (newAst && newAst.program) {
                path.replaceWith(newAst.program);
                path.stop();
              }
            }
          } catch {
            // Silently fall back if native transformation fails
          }
        },
      },
    },
  };
}
