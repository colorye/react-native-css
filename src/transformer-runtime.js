import { Dimensions, Appearance } from "react-native";
import CssCalc from "./features/css-calc";
import CssMedia from "./features/css-media";
import CssTransform from "./features/css-transform";
import CssVars from "./features/css-vars";

const INHERIT_PROPERTIES = [
  "color",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontWeight",
  "fontVariant",
  "letterSpacing",
  "lineHeight",
  "textAlign",
  "textTransform",
];

function getFlattenStyle(declarations) {
  if (!Array.isArray(declarations)) {
    return declarations;
  }

  const flattenDeclarations = declarations.reduce((acc, item) => {
    if (!item) return acc;
    if (Array.isArray(item)) {
      return acc.concat(getFlattenStyle(item));
    } else {
      return acc.concat(item);
    }
  }, []);

  return flattenDeclarations.reduce((acc, obj) => Object.assign(acc, obj), {});
}

function transform(stylesheet, classNames) {
  if (!stylesheet || !classNames) return;

  const transformedDeclarations = classNames.split(" ").map((className) => {
    const declaration = stylesheet[className];
    const globalDeclaration = stylesheet[":root"];

    if (!declaration && !globalDeclaration) return null;

    const { width, height } = Dimensions.get("window");
    const colorScheme = Appearance.getColorScheme();
    const vars = new CssVars();
    const transform = new CssTransform();
    const calc = new CssCalc();
    const media = new CssMedia();

    if (globalDeclaration) {
      vars.setGlobal(globalDeclaration, { width, height });
    }
    if (declaration) {
      vars.set(className, declaration, { width, height });
    }

    const transformStylesheet = (currentSelector, declaration) => {
      let results = {};

      for (let property in declaration) {
        if (vars.isVar(property)) continue;

        let value = declaration[property];
        let transformed;

        const [isMedia, matchedMedia] = media.match(property, { width, height, colorScheme });
        if (isMedia) {
          if (matchedMedia) {
            vars.set(property, value);

            transformed = transformStylesheet(property, value);
            if (transformed) {
              results = { ...results, ...transformed };
            }
          }

          continue;
        }

        [property, value] = transform.transformUnsafeValue(property, value);
        value = vars.injectVar(currentSelector, value);
        value = transform.transformUnsupportedUnit(value);
        value = transform.transformViewportUnit(value, { width, height });
        value = transform.removeUnit(value);
        value = calc.calc(value);
        value = calc.calcColor(value);

        if (value === undefined) continue;

        transformed = transform.transform(property, value);
        if (transformed) {
          results = { ...results, ...transformed };
        }
      }

      return results;
    };

    return transformStylesheet(className, declaration);
  });

  return getFlattenStyle(transformedDeclarations);
}

function getInheritStyle(declarations) {
  if (!declarations) return;

  const inheritDeclarations = Object.entries(declarations).reduce((res, [key, value]) => {
    if (INHERIT_PROPERTIES.includes(key)) {
      res[key] = value;
    }
    return res;
  }, {});

  return inheritDeclarations;
}

function getStyle(stylesheet, [inheritStyle, className, style]) {
  return getFlattenStyle([
    getInheritStyle(getFlattenStyle(inheritStyle)),
    transform(stylesheet, className),
    style,
  ]);
}

export default {
  getStyle,
};
