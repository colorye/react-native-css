const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const crateDir = path.resolve(__dirname, "../crates/transformer");
const platform = process.platform;
const arch = process.arch;

console.log(`[build-native] Building Rust transformer in ${crateDir} for ${platform}-${arch}...`);
execSync("cargo build --release", { cwd: crateDir, stdio: "inherit" });

let sourceLib = "";
let platformNodeName = "";

switch (platform) {
  case "darwin":
    sourceLib = path.join(crateDir, "target/release/libcolorye_react_native_css_transformer.dylib");
    platformNodeName = `transformer.darwin-${arch}.node`;
    break;
  case "linux":
    sourceLib = path.join(crateDir, "target/release/libcolorye_react_native_css_transformer.so");
    platformNodeName = `transformer.linux-${arch}-gnu.node`;
    break;
  case "win32":
    sourceLib = path.join(crateDir, "target/release/colorye_react_native_css_transformer.dll");
    platformNodeName = `transformer.win32-${arch}-msvc.node`;
    break;
  default:
    throw new Error(`Unsupported build platform: ${platform}`);
}

const targetNode = path.join(crateDir, "transformer.node");
const targetPlatformNode = path.join(crateDir, platformNodeName);

if (fs.existsSync(sourceLib)) {
  fs.copyFileSync(sourceLib, targetNode);
  fs.copyFileSync(sourceLib, targetPlatformNode);
  console.log(`[build-native] Copied ${sourceLib} -> ${targetNode} & ${targetPlatformNode}`);

  if (platform === "darwin") {
    try {
      execSync(`codesign --force --deep -s - "${targetNode}" "${targetPlatformNode}"`, { stdio: "inherit" });
    } catch {
      // Ignore codesign errors
    }
  }
} else {
  console.warn(`[build-native] Warning: Compiled library not found at ${sourceLib}`);
}
