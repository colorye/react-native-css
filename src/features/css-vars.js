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
    return /^--[\w-]+/.test(property);
  };

  this.injectVar = (selector, value) => {
    if (value === undefined) return value;

    const variables = this.get(selector);

    const findTopLevelComma = (str) => {
      let depth = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === "(") depth++;
        else if (char === ")") depth--;
        else if (char === "," && depth === 0) return i;
      }
      return -1;
    };

    const resolveValue = (val, seen = new Set()) => {
      if (typeof val !== "string") return val;

      let result = val;
      let hasVar = result.includes("var(");

      while (hasVar) {
        const start = result.indexOf("var(");
        if (start === -1) break;

        let depth = 0;
        let end = -1;
        for (let i = start + 3; i < result.length; i++) {
          const char = result[i];
          if (char === "(") {
            depth++;
          } else if (char === ")") {
            depth--;
            if (depth === 0) {
              end = i;
              break;
            }
          }
        }

        if (end === -1) break;

        const inner = result.slice(start + 4, end);
        const commaIdx = findTopLevelComma(inner);
        const variableName = (commaIdx === -1 ? inner : inner.slice(0, commaIdx)).trim();
        const defaultValue = commaIdx === -1 ? undefined : inner.slice(commaIdx + 1).trim();

        let resolved;
        if (seen.has(variableName)) {
          resolved =
            defaultValue !== undefined
              ? resolveValue(defaultValue, seen)
              : DEFAULT_VARIABLE_VALUE;
        } else {
          seen.add(variableName);
          const resolvedVal = variables[variableName];
          if (resolvedVal === undefined || resolvedVal === "initial") {
            resolved =
              defaultValue !== undefined
                ? resolveValue(defaultValue, seen)
                : DEFAULT_VARIABLE_VALUE;
          } else {
            resolved = resolveValue(resolvedVal, seen);
          }
        }

        result = result.slice(0, start) + String(resolved) + result.slice(end + 1);
        hasVar = result.includes("var(");
        seen = new Set();
      }

      return result;
    };

    return resolveValue(value);
  };

  return this;
}
