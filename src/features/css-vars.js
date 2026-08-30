import CssMedia from "./css-media";

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
    return /^--[\w-]+/.test(property);
  };

  this.injectVar = (selector, value) => {
    if (value === undefined || typeof value !== "string") return value;

    const variables = this.get(selector);

    function resolveOnce(str) {
      let result = "";
      let i = 0;
      let changed = false;

      while (i < str.length) {
        const varIndex = str.indexOf("var(", i);
        if (varIndex === -1) {
          result += str.slice(i);
          break;
        }

        result += str.slice(i, varIndex);
        let depth = 1;
        let j = varIndex + 4;
        let commaIndex = -1;

        while (j < str.length && depth > 0) {
          if (str[j] === "(") {
            depth++;
          } else if (str[j] === ")") {
            depth--;
          } else if (str[j] === "," && depth === 1 && commaIndex === -1) {
            commaIndex = j;
          }
          j++;
        }

        if (depth !== 0) {
          result += str.slice(varIndex);
          break;
        }

        changed = true;
        let varName, fallback;
        if (commaIndex !== -1) {
          varName = str.slice(varIndex + 4, commaIndex).trim();
          fallback = str.slice(commaIndex + 1, j - 1).trim();
        } else {
          varName = str.slice(varIndex + 4, j - 1).trim();
          fallback = undefined;
        }

        const val = variables[varName];
        if (val !== undefined && val !== "initial" && val !== "") {
          result += val;
        } else if (fallback !== undefined) {
          result += fallback;
        } else {
          result += "";
        }

        i = j;
      }

      return { result, changed };
    }

    let current = value;
    let iterations = 0;
    while (iterations < 10) {
      const { result, changed } = resolveOnce(current);
      if (!changed || result === current) break;
      current = result;
      iterations++;
    }
    return current;
  };

  return this;
}
