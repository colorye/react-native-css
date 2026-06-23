import { camelize } from "../utils/helper";
import { precomputeDeclaration } from "./build-transform";

const SUPPORTED_RULE_TYPES = ["rule", "media"];

// Regex for CSS variable detection
const cssVarRe = /^--[\w-]+/;

export default function Stylesheet() {
  // Store raw declarations (before pre-computation)
  this.rawStylesheet = {};
  // Store pre-computed declarations
  this.stylesheet = {};

  const _getSelectorName = (selector) => {
    if (selector === ":root") return selector;
    return selector.replace(/^\./, "").replace(/\\/g, ""); // remove escape backslash
  };

  const isVar = (property) => {
    return cssVarRe.test(property);
  };

  this.isRuleTypeSupported = (type) => {
    return SUPPORTED_RULE_TYPES.includes(type);
  };

  this.isSelectorSupported = (selector) => {
    if (selector === ":root") return true;
    if (selector.includes(" ")) return false;
    if (!selector.startsWith(".")) return false;
    return true;
  };

  this.simplifyDeclarations = (declarations) => {
    return (declarations || []).reduce((res, declaration) => {
      if (declaration.type !== "declaration") return res;

      const { property, value } = declaration;
      if (isVar(property)) {
        res[property] = value;
      } else {
        res[camelize(property)] = value;
      }

      return res;
    }, {});
  };

  this.upsert = (selector, declarations) => {
    const selectorName = _getSelectorName(selector);

    // Merge raw declarations
    this.rawStylesheet[selectorName] = {
      ...this.rawStylesheet[selectorName],
      ...declarations,
    };
  };

  this.finalize = () => {
    // Pre-compute all declarations at the end
    for (const [selector, rawDecl] of Object.entries(this.rawStylesheet)) {
      const { _static, _dynamic, _hasDynamic } = precomputeDeclaration(rawDecl);

      if (_hasDynamic) {
        // Has dynamic properties - store both static and dynamic
        this.stylesheet[selector] = { _static, _dynamic };
      } else {
        // Fully static - just store the static object directly
        this.stylesheet[selector] = _static;
      }
    }
  };

  this.toJSON = () => {
    // Finalize pre-computation before serializing
    this.finalize();
    return JSON.stringify(this.stylesheet);
  };

  return this;
}
