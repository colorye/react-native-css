const calcRe = /calc\(([^)]+)\)/g;

const colorRe1 =
  /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+)\s*)?\)/g;
const colorRe2 = /rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)/g;

function itohex(component: string | number) {
  const hex = Number(component).toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
}

export class CssCalc {
  calc = (value?: string) => {
    if (value === undefined) {
      return value;
    }

    return value.replace(calcRe, (_, calc: string) => {
      try {
        const calcFunc = new Function(`return ${calc}`);
        const calcValue = calcFunc();
        return calcValue;
      } catch {
        return 0;
      }
    });
  };

  calcColor = (value?: string) => {
    if (value === undefined) {
      return value;
    }

    value = value.replace(colorRe1, (_, r, g, b, a) => {
      a = parseFloat(a);
      if (isNaN(a) || a >= 1) {
        return `#${itohex(r)}${itohex(g)}${itohex(b)}`;
      }

      a = Math.round(a * 255);
      return `#${itohex(r)}${itohex(g)}${itohex(b)}${itohex(a)}`;
    });
    value = value.replace(colorRe2, (_, r, g, b, a) => {
      a = parseFloat(a);
      if (isNaN(a) || a >= 1) {
        return `#${itohex(r)}${itohex(g)}${itohex(b)}`;
      }

      a = Math.round(a * 255);
      return `#${itohex(r)}${itohex(g)}${itohex(b)}${itohex(a)}`;
    });

    return value;
  };
}
