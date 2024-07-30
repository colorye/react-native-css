import { CssMedia } from "@/features/css-media";

const DEFAULT_VARIABLE_VALUE = 0;

export class CssVars {
  private global = {};
  private data = {};

  private media = new CssMedia();

  setGlobal = (
    declarations: any,
    { width, height }: { width: number; height: number },
  ) => {
    for (const property in declarations) {
      const value = declarations[property];

      const [isMedia, matchedMedia] = this.media.match(property, {
        width,
        height,
      });
      if (isMedia) {
        if (matchedMedia) {
          this.setGlobal(value);
        }

        continue;
      }

      if (this.isVar(property)) {
        this.global[property] = value;
      }
    }
  };

  getGlobal = () => {
    return this.global;
  };

  set = (selector, declarations, { width, height } = {}) => {
    for (const property in declarations) {
      const value = declarations[property];

      const [isMedia, matchedMedia] = media.match(property, { width, height });
      if (isMedia) {
        if (matchedMedia) {
          this.set(selector, value);
        }

        continue;
      }

      if (this.isVar(property)) {
        if (!this.data[selector]) this.data[selector] = {};
        this.data[selector][property] = value;
      }
    }
  };

  get = (selector) => {
    return {
      ...this.global,
      ...(this.data[selector] || {}),
    };
  };

  isVar = (property) => {
    return /^--\w+/.test(property);
  };

  injectVar = (selector, value) => {
    if (value === undefined) return value;

    const variables = this.get(selector);
    return value.replace(/var\(([^)]+)\)/g, (match, variableName) => {
      return variables[variableName] || DEFAULT_VARIABLE_VALUE;
    });
  };
}
