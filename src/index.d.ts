import React from "react";
import type { StyleProp, ViewStyle, TextStyle, ImageStyle } from "react-native";

export interface StyleMapping {
  className?: string;
  contentContainerClassName?: string;
  [key: string]: string | undefined;
}

export interface GroupState {
  pressed: boolean;
  hovered?: boolean;
  focus?: boolean;
}

export const GroupContext: React.Context<GroupState>;
export const InheritContext: React.Context<Record<string, any> | undefined>;

export function setGlobalStylesheet(sheet: Record<string, any>): void;
export function getGlobalStylesheet(): Record<string, any>;

/**
 * Wraps any React Native or third-party component to support className mapping.
 *
 * @example
 * ```tsx
 * import { FlashList } from "@shopify/flash-list";
 * import { cssInterop } from "@colorye/react-native-css";
 *
 * const StyledFlashList = cssInterop(FlashList, {
 *   className: "style",
 *   contentContainerClassName: "contentContainerStyle",
 * });
 * ```
 */
export function cssInterop<P extends object>(
  Component: React.ComponentType<P>,
  mapping?: StyleMapping
): React.ForwardRefExoticComponent<
  React.PropsWithoutRef<P> & {
    className?: string;
    contentContainerClassName?: string;
    inheritStyle?: any;
  } & React.RefAttributes<any>
>;

/**
 * Alias for cssInterop.
 */
export function remapProps<P extends object>(
  Component: React.ComponentType<P>,
  mapping: StyleMapping
): React.ForwardRefExoticComponent<
  React.PropsWithoutRef<P> & {
    className?: string;
    contentContainerClassName?: string;
    inheritStyle?: any;
  } & React.RefAttributes<any>
>;

export namespace Runtime {
  export function getFlattenStyle(declarations: any): any;
  export function getStyle(
    stylesheet: any,
    args: [inheritStyle?: any, className?: string, style?: any, elementName?: string]
  ): any;
  export function getInheritStyle(declarations: any): Record<string, any> | undefined;
  export function mergeStyles(inheritStyle: any, staticStyles: any, inlineStyle: any): any;
  export function clearCache(): void;
}

export function getStylesheet(css: string, filename?: string): string;
export function writeStylesheetJSON(content: string, filename?: string): void;
export function transform(args: { src: string; filename: string; options?: any }): any;

declare const _default: {
  cssInterop: typeof cssInterop;
  remapProps: typeof remapProps;
  setGlobalStylesheet: typeof setGlobalStylesheet;
  getGlobalStylesheet: typeof getGlobalStylesheet;
  GroupContext: typeof GroupContext;
  InheritContext: typeof InheritContext;
  Runtime: typeof Runtime;
  getStylesheet: typeof getStylesheet;
  transform: typeof transform;
  writeStylesheetJSON: typeof writeStylesheetJSON;
};

export default _default;
