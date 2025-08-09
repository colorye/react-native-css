import CssMedia from "./css-media";

const DEFAULT_VARIABLE_VALUE = 0;

export default function CssVars() {
  this.global = {};
  this.data = {};

  const media = new CssMedia();

  this.setGlobal = (declarations, { width, height } = {}) => {
    for (const property in declarations) {
      const value = declarations[property];

      const [isMedia, matchedMedia] = media.match(property, { width, height });
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

  this.getGlobal = () => {
    return this.global;
  };

  this.set = (selector, declarations, { width, height } = {}) => {
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

  this.get = (selector) => {
    return {
      ...this.global,
      ...(this.data[selector] || {}),
    };
  };

  this.isVar = (property) => {
    return /^--\w+/.test(property);
  };

  this.injectVar = (selector, value) => {
    if (value === undefined) return value;

    const variables = this.get(selector);
    return value.replace(
      /var\((--[^,)]+)(?:,\s*([^)]+))?\)/g,
      function (match, variableName, defaultValue) {
        return variables[variableName] || defaultValue || DEFAULT_VARIABLE_VALUE;
      },
    );
  };

  return this;
}
