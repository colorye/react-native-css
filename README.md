# @colorye/react-native-css ⚡️

> High-performance, Rust SWC–powered Tailwind CSS v4 and standard CSS compiler for React Native and Expo.

[![npm version](https://img.shields.io/npm/v/@colorye/react-native-css.svg?style=flat-square)](https://www.npmjs.com/package/@colorye/react-native-css)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

---

## 🌟 Why @colorye/react-native-css?

Modern React Native apps need the ergonomics of Tailwind CSS v4 and standard CSS without sacrificing runtime performance. `@colorye/react-native-css` compiles utility classes directly into **hoisted `StyleSheet.create` objects (`_rnStyles`)** using a native Rust SWC transform layer.

- 🦀 **Rust SWC Compiler**: Transforms JSX at native speeds, hoisting static styles to `StyleSheet.create` with **zero runtime overhead**.
- 🎨 **Tailwind CSS v4 Native**: Full support for CSS-first config, `@theme`, `oklch()`, `lab()`, CSS custom properties (`var()`), and nested `calc()`.
- ⚡ **Optimized Dynamic States**: Pseudo-classes like `active:`, `pressed:`, and `disabled:` compile to optimized React Native Pressable render callbacks.
- 🌳 **Group States & Text Inheritance**: Native coordination for `group` / `group-active:` and CSS text style inheritance (`color`, `fontSize`, `fontWeight`, etc.).
- 🔄 **Component Interoperability**: First-class `cssInterop` and `remapProps` for third-party libraries (`FlashList`, `TrueSheet`, etc.).

---

## ⚖️ SOTA Comparison

| Feature / Metric | `@colorye/react-native-css` | NativeWind v4 | Unistyles 3.0 | Tamagui | Vanilla `StyleSheet` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Styling Paradigm** | **Tailwind v4 / Modern CSS** | Tailwind v3/v4 | Custom StyleSheet DSL | Custom UI / Styled DSL | Plain JS Objects |
| **Compiler Engine** | **Rust (SWC + LightningCSS)** | Babel / LightningCSS | None (Pure C++ JSI) | Babel / Node AST | None |
| **Static Style Inlining** | **Hoisted `StyleSheet.create`** | Runtime Mapping | Runtime C++ Stylesheet | Compile-time flattening | Manual |
| **Tailwind v4 (@theme, oklch)** | **✅ First-Class Native** | 🟡 Requires plugins | ❌ Custom tokens | ❌ Custom config | ❌ Manual |
| **Static Class Runtime Cost** | **0 ms** | Low-to-medium | Low (C++ JSI cache) | Low-to-zero | 0 ms |
| **Dynamic Pseudo-states** (`active:`, `disabled:`) | **Auto Pressable / JSX Transform** | Dynamic hooks / proxy | Runtime state bindings | Compiler variants | Manual state logic |
| **CSS Text Style Inheritance** | **Automatic (`InheritContext`)** | Web-only / explicit | Manual | Theme-based | Manual |
| **Third-Party Component Interop** | **`cssInterop` / `remapProps`** | `cssInterop` | Custom C++ wrappers | Custom styled wrappers | Manual `style` passing |

---

## 📦 Installation

```bash
npm install @colorye/react-native-css
# or
yarn add @colorye/react-native-css
# or
pnpm add @colorye/react-native-css
```

---

## ⚙️ Setup & Configuration

### 1. Metro Configuration (`metro.config.js`)

Wrap your Metro config or assign the custom CSS transformer:

```javascript
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("@colorye/react-native-css/transformer"),
};

module.exports = config;
```

### 2. Babel Configuration (`babel.config.js`)

Add the Babel plugin pointing to your global stylesheet:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "@colorye/react-native-css/babel",
        {
          css: "./src/assets/styles/index.css",
          paths: ["src/"],
        },
      ],
    ],
  };
};
```

### 3. Tailwind CSS Setup (`src/assets/styles/index.css`)

Import Tailwind CSS v4 in your main CSS file:

```css
@import "tailwindcss";

@theme {
  --color-primary: #0065d6;
  --color-secondary: #0ea5e9;
  --font-display: "Inter-Bold";
}
```

---

## 🚀 TypeScript Support

Add the type definitions to your `env.d.ts` or `global.d.ts` for JSX `className` auto-completion on all React Native primitives:

```typescript
/// <reference types="@colorye/react-native-css/types" />
```

---

## 💡 Usage Examples

### Basic Styling & Pseudo-classes

```tsx
import { View, Text, Pressable } from "react-native";

export function UserCard() {
  return (
    <View className="p-4 bg-white rounded-2xl shadow-sm">
      <Text className="text-xl font-bold text-slate-900">
        React Native CSS
      </Text>
      <Pressable className="mt-4 px-4 py-2 bg-primary rounded-xl active:scale-95 active:opacity-80">
        <Text className="text-white text-center font-medium">Get Started</Text>
      </Pressable>
    </View>
  );
}
```

### Group Hover / Active States

```tsx
import { Pressable, View, Text } from "react-native";

export function GroupItem() {
  return (
    <Pressable className="group flex-row items-center p-3 rounded-lg bg-slate-100">
      <View className="w-3 h-3 rounded-full bg-slate-400 group-active:bg-primary" />
      <Text className="ml-3 text-slate-700 group-active:text-primary font-medium">
        Click to Highlight
      </Text>
    </Pressable>
  );
}
```

### Third-Party Component Interop (`cssInterop`)

```tsx
import { FlashList } from "@shopify/flash-list";
import { cssInterop } from "@colorye/react-native-css";

export const StyledFlashList = cssInterop(FlashList, {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
});

// Usage
<StyledFlashList
  className="flex-1 bg-slate-50"
  contentContainerClassName="p-4"
  data={data}
  renderItem={renderItem}
/>
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

```bash
# Build Rust native bindings
yarn build:native

# Build JS distribution
yarn build:js

# Run full build
yarn build
```

---

## 📄 License

MIT © [Rye Nguyen](https://github.com/ryenguyen7411)
