/**
 * Smoke test for the native N-API binding.
 *
 * Loads the real compiled binary (crates/transformer) and exercises the three
 * exported functions. Run after `yarn build:native`.
 */
const assert = require("node:assert/strict");

const native = require("../crates/transformer");

for (const fn of ["compileCss", "transformJsx", "resolveRuntimeStyles"]) {
  assert.equal(typeof native[fn], "function", `native.${fn} should be a function`);
}

// 1. compileCss -> JSON stylesheet
const css = `
  :root { --color-primary: #0065d6; }
  .p-4 { padding: 1rem; }
  .bg-primary { background-color: var(--color-primary); }
`;
const sheetJson = native.compileCss(css);
assert.equal(typeof sheetJson, "string");
const sheet = JSON.parse(sheetJson);
assert.equal(typeof sheet, "object");
assert.ok(sheet[":root"], "stylesheet should contain a :root entry");

// 2. transformJsx -> hoisted StyleSheet
const src = `
import { View } from "react-native";
export const A = () => <View className="p-4 bg-primary" />;
`;
const out = native.transformJsx(src, {
  filename: "smoke.tsx",
  stylesheetJson: sheetJson,
  sourceMaps: true,
});
assert.ok(out && typeof out.code === "string" && out.code.length > 0, "transformJsx should return code");
assert.ok(out.code.includes("StyleSheet"), "transformed code should reference StyleSheet");
assert.ok(!out.code.includes('className="p-4 bg-primary"'), "static className should be compiled away");
assert.ok(out.map, "transformJsx should return a sourcemap when sourceMaps is true");

// 3. resolveRuntimeStyles -> merged style JSON
const resolved = JSON.parse(native.resolveRuntimeStyles(sheetJson, "p-4", { platform: "ios" }));
assert.equal(typeof resolved, "object");

console.log(`[smoke-test] OK on ${process.platform}-${process.arch}`);
