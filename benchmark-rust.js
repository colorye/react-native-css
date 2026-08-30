const babel = require("@babel/core");
const babelPlugin = require("./dist/babel").default;
const { transformJsx } = require("./crates/transformer");

const sampleCode = `
import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';

export default function BenchmarkComponent() {
  return (
    <ScrollView className="flex-1 bg-navy-700" contentContainerClassName="p-6 pb-12">
      <View className="mb-6 flex-row items-center justify-between text-yellow-500">
        <View>
          <Text className="text-2xl font-bold">Piano For Everyone</Text>
          <Text className="mt-1 text-sm">Learn chords, scales, and practice daily</Text>
        </View>
        <View className="rounded-full bg-blue-500 px-3 py-1">
          <Text className="text-xs font-semibold text-white">v1.0</Text>
        </View>
      </View>
      <View className="mb-6 rounded-2xl bg-navy-600 p-5 shadow-base">
        <Text className="text-xs font-semibold uppercase tracking-wider text-green-500">Daily Goal</Text>
        <Text className="mt-1 text-lg font-bold text-white">15-minute Chord Practice</Text>
        <Pressable className="mt-4 rounded-xl bg-primary py-3 items-center">
          <Text className="font-semibold text-white">Start Practice</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
`;

const stylesheet = require("./dist/exported-stylesheet.json");
const stylesheetJson = JSON.stringify(stylesheet);

const ITERATIONS = 500;

console.log(`\n======================================================`);
console.log(`🚀 BENCHMARK: Rust SWC Transformer vs Babel Transform`);
console.log(`📊 Iterations: ${ITERATIONS} files`);
console.log(`======================================================\n`);

const babelConfig = {
  presets: [
    ["@babel/preset-typescript", { isTSX: true, allExtensions: true }],
  ],
  plugins: [
    [
      babelPlugin,
      {
        paths: ["src/(.+).(tsx|jsx)$"],
        excludes: ["node_modules"],
        css: "./dist/exported-stylesheet.json",
      },
    ],
  ],
};

// Warm up
transformJsx(sampleCode, { filename: "Test.tsx", stylesheetJson });
babel.transformSync(sampleCode, {
  filename: "src/Test.tsx",
  ...babelConfig,
});

// 1. Benchmark Rust SWC Transformer
const startRust = process.hrtime.bigint();
for (let i = 0; i < ITERATIONS; i++) {
  transformJsx(sampleCode, { filename: `Component${i}.tsx`, stylesheetJson });
}
const endRust = process.hrtime.bigint();
const rustTotalMs = Number(endRust - startRust) / 1_000_000;
const rustAvgMs = rustTotalMs / ITERATIONS;

// 2. Benchmark Babel Plugin
const startBabel = process.hrtime.bigint();
for (let i = 0; i < ITERATIONS; i++) {
  babel.transformSync(sampleCode, {
    filename: `src/Component${i}.tsx`,
    ...babelConfig,
  });
}
const endBabel = process.hrtime.bigint();
const babelTotalMs = Number(endBabel - startBabel) / 1_000_000;
const babelAvgMs = babelTotalMs / ITERATIONS;

const speedup = (babelTotalMs / rustTotalMs).toFixed(1);

console.log(`⚡ Rust SWC Transformer:`);
console.log(`   - Total time: ${rustTotalMs.toFixed(2)} ms`);
console.log(`   - Avg per file: ${rustAvgMs.toFixed(3)} ms (${(rustAvgMs * 1000).toFixed(1)} µs)`);

console.log(`\n🐢 Babel Transform:`);
console.log(`   - Total time: ${babelTotalMs.toFixed(2)} ms`);
console.log(`   - Avg per file: ${babelAvgMs.toFixed(3)} ms`);

console.log(`\n🏆 Performance Result:`);
console.log(`   👉 Rust SWC Transformer is ${speedup}x FASTER than Babel!\n`);
