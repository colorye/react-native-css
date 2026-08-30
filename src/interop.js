import React, { createContext, forwardRef, useContext } from "react";
import Runtime from "./transformer-runtime";

export const InheritContext = createContext(undefined);
export const GroupContext = createContext({ pressed: false, hovered: false, focus: false });

let globalStylesheet = {};

try {
  const raw = require("./exported-stylesheet.json");
  let current = raw;
  while (current?.default && typeof current.default === "object" && !current[":root"]) {
    current = current.default;
  }
  globalStylesheet = current || {};
} catch {
  // Fallback to empty if not yet compiled
}

export function setGlobalStylesheet(sheet) {
  if (sheet && typeof sheet === "object") {
    let current = sheet;
    while (current?.default && typeof current.default === "object" && !current[":root"]) {
      current = current.default;
    }
    globalStylesheet = current;
    Runtime.clearCache?.();
  }
}

export function getGlobalStylesheet() {
  return globalStylesheet;
}

/**
 * cssInterop(Component, mapping)
 *
 * Wraps any React Native or third-party component to support className mapping.
 *
 * @example
 * cssInterop(FlashList, {
 *   className: "style",
 *   contentContainerClassName: "contentContainerStyle",
 * });
 *
 * @param {React.ComponentType} Component
 * @param {Record<string, string>} mapping Mapping of class props to style props
 * @returns {React.ForwardRefExoticComponent}
 */
export function cssInterop(Component, mapping = { className: "style" }) {
  const InteropComponent = forwardRef((props, ref) => {
    const parentInherit = useContext(InheritContext);
    const parentGroup = useContext(GroupContext);
    const inheritStyle = props.inheritStyle || parentInherit;
    const [groupPressed, setGroupPressed] = React.useState(false);

    const nextProps = { ...props };
    if (ref) {
      nextProps.ref = ref;
    }

    const sheet = getGlobalStylesheet();
    let currentInherit = parentInherit;
    let isGroupProvider = false;

    // Check if this component acts as a group container
    for (const classProp of Object.keys(mapping)) {
      const val = props[classProp];
      if (typeof val === "string" && (val === "group" || val.split(/\s+/).includes("group"))) {
        isGroupProvider = true;
        break;
      }
    }

    if (isGroupProvider) {
      const originalOnPressIn = props.onPressIn;
      const originalOnPressOut = props.onPressOut;
      nextProps.onPressIn = (e) => {
        setGroupPressed(true);
        originalOnPressIn?.(e);
      };
      nextProps.onPressOut = (e) => {
        setGroupPressed(false);
        originalOnPressOut?.(e);
      };
    }

    for (const [classProp, styleProp] of Object.entries(mapping)) {
      const classValue = props[classProp];
      const hasClass = typeof classValue === "string" && classValue.length > 0;
      const isPrimaryStyle = styleProp === "style";
      const hasInherit = isPrimaryStyle && Boolean(inheritStyle);

      if (hasClass) {
        const hasActiveVariants = /(^|\s)(active|pressed):/.test(classValue);
        const hasDisabledVariants = /(^|\s)disabled:/.test(classValue);
        const hasGroupActiveVariants = /(^|\s)group-(active|pressed):/.test(classValue);

        const isDisabled = Boolean(props.disabled || props.accessibilityState?.disabled);

        if ((hasActiveVariants || hasDisabledVariants || hasGroupActiveVariants) && isPrimaryStyle) {
          const classes = classValue.trim().split(/\s+/);
          const normalClasses = [];
          const activeClasses = [];
          const disabledClasses = [];
          const groupActiveClasses = [];

          for (const cls of classes) {
            if (cls.startsWith("active:") || cls.startsWith("pressed:")) {
              const baseCls = cls.replace(/^(active|pressed):/, "");
              activeClasses.push(baseCls);
            } else if (cls.startsWith("disabled:")) {
              const baseCls = cls.replace(/^disabled:/, "");
              disabledClasses.push(baseCls);
            } else if (cls.startsWith("group-active:") || cls.startsWith("group-pressed:")) {
              const baseCls = cls.replace(/^group-(active|pressed):/, "");
              groupActiveClasses.push(baseCls);
            } else {
              normalClasses.push(cls);
            }
          }

          const normalStyle = Runtime.getStyle(sheet, [
            hasInherit ? inheritStyle : undefined,
            normalClasses.join(" "),
            typeof props[styleProp] === "object" ? props[styleProp] : undefined,
          ]);

          const activeStyle = activeClasses.length > 0
            ? Runtime.getStyle(sheet, [undefined, activeClasses.join(" "), undefined])
            : undefined;

          const disabledStyle = disabledClasses.length > 0
            ? Runtime.getStyle(sheet, [undefined, disabledClasses.join(" "), undefined])
            : undefined;

          const groupActiveStyle = (hasGroupActiveVariants && parentGroup.pressed && groupActiveClasses.length > 0)
            ? Runtime.getStyle(sheet, [undefined, groupActiveClasses.join(" "), undefined])
            : undefined;

          if (hasActiveVariants || typeof props[styleProp] === "function") {
            nextProps[styleProp] = (state) => {
              const isPressed = (state && state.pressed) || false;
              const userStyle = typeof props[styleProp] === "function" ? props[styleProp](state) : null;
              const currentStyles = [normalStyle, groupActiveStyle];

              if (isPressed && !isDisabled && activeStyle) {
                currentStyles.push(activeStyle);
              }
              if (isDisabled && disabledStyle) {
                currentStyles.push(disabledStyle);
              }
              if (userStyle) {
                currentStyles.push(userStyle);
              }

              return currentStyles.filter(Boolean);
            };
          } else {
            const currentStyles = [
              normalStyle,
              groupActiveStyle,
              isDisabled ? disabledStyle : undefined,
              typeof props[styleProp] === "object" ? props[styleProp] : undefined,
            ].filter(Boolean);
            nextProps[styleProp] =
              currentStyles.length === 1
                ? currentStyles[0]
                : currentStyles.length > 1
                  ? currentStyles
                  : undefined;
          }

          const inheritable = Runtime.getInheritStyle(normalStyle);
          if (inheritable) {
            currentInherit = parentInherit
              ? { ...parentInherit, ...inheritable }
              : inheritable;
          }
        } else {
          // Dynamic className present - runtime resolution
          const computedStyle = Runtime.getStyle(sheet, [
            hasInherit ? inheritStyle : undefined,
            classValue,
            props[styleProp],
          ]);

          if (computedStyle !== undefined) {
            nextProps[styleProp] = computedStyle;

            if (isPrimaryStyle) {
              const inheritable = Runtime.getInheritStyle(computedStyle);
              if (inheritable) {
                currentInherit = parentInherit
                  ? { ...parentInherit, ...inheritable }
                  : inheritable;
              }
            }
          }
        }
        delete nextProps[classProp];
      } else if (isPrimaryStyle) {
        // Static inlined style or plain style prop with inheritance
        const ownStyle = props[styleProp];

        if (typeof ownStyle === "function") {
          if (hasInherit) {
            nextProps[styleProp] = (state) => {
              const res = ownStyle(state);
              return [inheritStyle, res];
            };
          } else {
            nextProps[styleProp] = ownStyle;
          }
        } else {
          const flatOwnStyle = ownStyle ? Runtime.getFlattenStyle(ownStyle) : undefined;

          if (hasInherit) {
            const merged = Runtime.mergeStyles(inheritStyle, flatOwnStyle, undefined);
            if (merged !== undefined) {
              nextProps[styleProp] = merged;
            }
          }

          // Inheritable styles come from either the component's own style or inherited from parent
          const combinedForInherit = hasInherit
            ? Runtime.mergeStyles(inheritStyle, flatOwnStyle, undefined)
            : flatOwnStyle;
          const ownInheritable = Runtime.getInheritStyle(combinedForInherit);

          if (ownInheritable) {
            currentInherit = parentInherit
              ? { ...parentInherit, ...ownInheritable }
              : ownInheritable;
          }
        }
      }
    }

    delete nextProps.inheritStyle;

    let element = React.createElement(Component, nextProps);

    if (isGroupProvider) {
      element = React.createElement(
        GroupContext.Provider,
        { value: { ...parentGroup, pressed: groupPressed } },
        element,
      );
    }

    if (currentInherit && currentInherit !== parentInherit) {
      return React.createElement(InheritContext.Provider, { value: currentInherit }, element);
    }

    return element;
  });

  const name = Component.displayName || Component.name || "Component";
  InteropComponent.displayName = `CssInterop(${name})`;

  return InteropComponent;
}

export function remapProps(Component, mapping) {
  return cssInterop(Component, mapping);
}

export default cssInterop;
