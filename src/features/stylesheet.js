import { camelize } from "../utils/helper";
import CssVars from "./css-vars";

const SUPPORTED_RULE_TYPES = ["rule", "media"];

export default function Stylesheet() {
  this.stylesheet = {};

  const vars = new CssVars();

  const _getSelectorName = (selector) => {
    if (selector === ":root") return selector;
    return selector.replace(/^\./, "").replace(/\\/g, ""); // remove escape backslash
  };

  this.isRuleTypeSupported = (type) => {
    if (SUPPORTED_RULE_TYPES.includes(type)) return true;
    return false;
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
      if (vars.isVar(property)) {
        res[property] = value;
      } else {
        res[camelize(property)] = value;
      }

      return res;
    }, {});
  };

  this.upsert = (selector, declarations) => {
    const selectorName = _getSelectorName(selector);
    this.stylesheet[selectorName] = {
      ...this.stylesheet[selectorName],
      ...declarations,
    };
  };

  this.toJSON = () => {
    return JSON.stringify(this.stylesheet);
  };

  return this;
}
