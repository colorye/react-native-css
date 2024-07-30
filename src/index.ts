import fs from "fs";
import path from "path";
import { parse as cssParse, Rule, Media } from "css";
import { Stylesheet } from "@/features/stylesheet";
import { iife } from "@/utils/helper";

const upstreamTransformer = iife(() => {
  try {
    return require("@expo/metro-config/babel-transformer");
  } catch (error) {
    try {
      return require("@react-native/metro-babel-transformer");
    } catch (error) {
      return require("metro-react-native-babel-transformer");
    }
  }
});

function getStylesheet(css: string) {
  const ast = cssParse(css);

  const stylesheet = new Stylesheet();

  function isRule(rule: any): rule is Rule {
    return rule.type === "rule";
  }

  function isMedia(rule: any): rule is Media {
    return rule.type === "media";
  }

  for (const rule of ast.stylesheet?.rules || []) {
    if (!stylesheet.isRuleTypeSupported(rule.type ?? "")) continue;
    if (isRule(rule)) {
      const declarations = stylesheet.simplifyDeclarations(rule.declarations);

      rule.selectors?.forEach((selector) => {
        if (!stylesheet.isSelectorSupported(selector)) return;
        stylesheet.upsert(selector, declarations);
      });
    }
  }

  // all @media will be injected at the end
  for (const rule of ast.stylesheet?.rules || []) {
    if (!stylesheet.isRuleTypeSupported(rule.type ?? "")) continue;
    if (isMedia(rule)) {
      const rules: Rule[] = rule.rules ?? [];
      for (const mediaRule of rules) {
        if (!stylesheet.isRuleTypeSupported(mediaRule.type)) continue;
        if (mediaRule.type === "rule") {
          const declarations = stylesheet.simplifyDeclarations(
            mediaRule.declarations,
          );

          mediaRule.selectors?.forEach((selector) => {
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

function debugStylesheets(content: string) {
  try {
    const dir = path.join(__dirname);
    fs.writeFileSync(`${dir}/exported-stylesheet.json`, content, {
      mode: 0o755,
    });
  } catch {}
}

module.exports.transform = function ({ src, filename, options }: any) {
  if (filename.endsWith(".css")) {
    return upstreamTransformer.transform({
      src: `module.exports = ${getStylesheet(src)}`,
      filename,
      options,
    });
  }
  return upstreamTransformer.transform({ src, filename, options });
};
