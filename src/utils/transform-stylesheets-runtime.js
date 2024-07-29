import { Dimensions } from "react-native";

const viewportUnitRe = /^([+-]?[0-9.]+)(vh|vw|vmin|vmax)$/;

function replaceViewportUnit(_, number, unit) {
  const dimensions = Dimensions.get("window");
  const dimensionsMap = {
    vw: dimensions.width,
    vh: dimensions.height,
  };

  const base = dimensionsMap[unit];
  return (parseFloat(number) * base) / 100;
}

export function transform(input) {
  if (!input) return {};

  const output = { ...input };
  for (const property in output) {
    const value = output[property];

    if (viewportUnitRe.test(value)) {
      output[property] = parseFloat(value.replace(viewportUnitRe, replaceViewportUnit));
    }
  }

  return output;
}
