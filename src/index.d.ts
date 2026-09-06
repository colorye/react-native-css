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

export interface InheritedStyles {
  color?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: string;
  textTransform?: string;
  [key: string]: any;
}

export const GroupContext: React.Context<GroupState>;
export const InheritContext: React.Context<InheritedStyles | undefined>;

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
export function cssInterop<T = any, P extends object = any>(
  Component: React.ComponentType<P>,
  mapping?: StyleMapping
): React.ForwardRefExoticComponent<
  React.PropsWithoutRef<P> & {
    className?: string;
    contentContainerClassName?: string;
    inheritStyle?: any;
  } & React.RefAttributes<T>
>;

/**
 * Alias for cssInterop.
 */
export function remapProps<T = any, P extends object = any>(
  Component: React.ComponentType<P>,
  mapping: StyleMapping
): React.ForwardRefExoticComponent<
  React.PropsWithoutRef<P> & {
    className?: string;
    contentContainerClassName?: string;
    inheritStyle?: any;
  } & React.RefAttributes<T>
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

/**
 * Plug-and-play zero-configuration helper for Expo and React Native Metro bundler.
 */
export function withReactNativeCss<T = any>(metroConfig: T, options?: { input?: string }): T;

declare const _default: {
  cssInterop: typeof cssInterop;
  remapProps: typeof remapProps;
  setGlobalStylesheet: typeof setGlobalStylesheet;
  getGlobalStylesheet: typeof getGlobalStylesheet;
  GroupContext: typeof GroupContext;
  InheritContext: typeof InheritContext;
  Runtime: typeof Runtime;
};

export default _default;
