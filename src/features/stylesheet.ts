import { camelize } from "@/utils/helper";
import { CssVars } from "@/features/css-vars";

const SUPPORTED_RULE_TYPES = ["rule", "media"];

export class Stylesheet {
  stylesheet: Record<string, any> = {};

  private vars = new CssVars();

  private _getSelectorName = (selector: string) => {
    if (selector === ":root") return selector;
    return selector.replace(/^\./, "").replace(/\\/g, ""); // remove escape backslash
  };

  isRuleTypeSupported = (type?: string) => {
    if (!type) return false;
    if (SUPPORTED_RULE_TYPES.includes(type)) return true;
    return false;
  };

  isSelectorSupported = (selector?: string) => {
    if (!selector) return false;
    if (selector === ":root") return true;
    if (selector.includes(" ")) return false;
    if (!selector.startsWith(".")) return false;
    return true;
  };

  simplifyDeclarations = (declarations?: any[]) => {
    return (declarations || []).reduce((res, declaration) => {
      if (declaration.type !== "declaration") return res;

      const { property, value } = declaration;
      if (this.vars.isVar(property)) {
        res[property] = value;
      } else {
        res[camelize(property)] = value;
      }

      return res;
    }, {});
  };

  upsert = (selector: string, declarations: any) => {
    const selectorName = this._getSelectorName(selector);
    this.stylesheet[selectorName] = {
      ...this.stylesheet[selectorName],
      ...declarations,
    };
  };

  toJSON = () => {
    return JSON.stringify(this.stylesheet);
  };
}
