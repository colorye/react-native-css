export function camelize(str) {
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
}

export function iife(func) {
  return typeof func === "function" && func();
}

export function itohex(component) {
  const hex = Number(component).toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
}

export function rgbtohex(color) {
  function itohex(component) {
    const hex = component.toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  }

  // Regular expression patterns to match rgb, rgba, and modern rgb/rgba color values
  const rgbPattern = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/;
  const rgbaPattern = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/;
  const modernRgbPattern = /rgb\((\d+)\s+(\d+)\s+(\d+)\/([\d.]+)\)/;
  const modernRgbaPattern = /rgba\((\d+)\s+(\d+)\s+(\d+)\/([\d.]+)\)/;

  let red, green, blue, alpha;
  // Check if the color is in the rgb format
  if (rgbPattern.test(color)) {
    [, red, green, blue] = rgbPattern.exec(color);
  }

  // Check if the color is in the rgba format
  if (rgbaPattern.test(color)) {
    [, red, green, blue, alpha] = rgbaPattern.exec(color);
    alpha = parseFloat(alpha);
  }

  // Check if the color is in the modern rgb format
  if (modernRgbPattern.test(color)) {
    [, red, green, blue, alpha] = modernRgbPattern.exec(color);
    alpha = parseFloat(alpha);
  }

  // Check if the color is in the modern rgba format
  if (modernRgbaPattern.test(color)) {
    [, red, green, blue, alpha] = modernRgbaPattern.exec(color);
    alpha = parseFloat(alpha);
  }

  // Invalid color format, return the original color
  if (!red || !green || !blue) {
    return color;
  }

  if (alpha === 1 || isNaN(alpha)) {
    return `#${itohex(parseInt(red))}${itohex(parseInt(green))}${itohex(parseInt(blue))}`;
  }

  const hexOpacity = itohex(Math.round(alpha * 255));
  return `#${itohex(parseInt(red))}${itohex(parseInt(green))}${itohex(
    parseInt(blue),
  )}${hexOpacity}`;
}
