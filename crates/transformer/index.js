const { existsSync, readFileSync, readdirSync } = require("fs");
const { join } = require("path");

const { platform, arch } = process;

let nativeBinding = null;
let loadError = null;

function isMusl() {
  if (!process.report || typeof process.report.getReport !== "function") {
    try {
      const lddPath = require("child_process").execSync("which ldd").toString().trim();
      return readFileSync(lddPath, "utf8").includes("musl");
    } catch {
      return true;
    }
  } else {
    const { glibcVersionRuntime } = process.report.getReport().header;
    return !glibcVersionRuntime;
  }
}

// 1. Resolve candidate binary filename for current OS & architecture
function getCandidateFilenames() {
  const candidates = [];

  switch (platform) {
    case "darwin":
      if (arch === "arm64") {
        candidates.push("transformer.darwin-arm64.node");
      } else if (arch === "x64") {
        candidates.push("transformer.darwin-x64.node");
      }
      candidates.push("transformer.darwin-universal.node");
      break;

    case "linux":
      if (arch === "x64") {
        if (isMusl()) {
          candidates.push("transformer.linux-x64-musl.node");
        } else {
          candidates.push("transformer.linux-x64-gnu.node");
        }
      } else if (arch === "arm64") {
        if (isMusl()) {
          candidates.push("transformer.linux-arm64-musl.node");
        } else {
          candidates.push("transformer.linux-arm64-gnu.node");
        }
      }
      break;

    case "win32":
      if (arch === "x64") {
        candidates.push("transformer.win32-x64-msvc.node");
      } else if (arch === "arm64") {
        candidates.push("transformer.win32-arm64-msvc.node");
      }
      break;

    case "android":
      if (arch === "arm64") {
        candidates.push("transformer.android-arm64.node");
      } else if (arch === "arm") {
        candidates.push("transformer.android-arm-eabi.node");
      }
      break;
  }

  // Generic local fallback (built by `cargo build --release`)
  candidates.push("transformer.node");

  return candidates;
}

// 2. Load the first matching candidate file from inside this package
const candidates = getCandidateFilenames();
for (const file of candidates) {
  const fullPath = join(__dirname, file);
  if (existsSync(fullPath)) {
    try {
      nativeBinding = require(`./${file}`);
      break;
    } catch (e) {
      loadError = e;
    }
  }
}

if (!nativeBinding) {
  const present = readdirSync(__dirname).filter((f) => f.endsWith(".node"));
  const errorMsg =
    `[@colorye/react-native-css] Failed to load the native binding on ${platform}-${arch}.\n` +
    `Tried: ${candidates.join(", ")}\n` +
    `Prebuilt binaries found in ${__dirname}: ${present.length ? present.join(", ") : "none"}\n` +
    `Prebuilt binaries are published for: darwin-arm64, darwin-x64, linux-x64-gnu, win32-x64-msvc.\n` +
    `On other platforms, build from source with \`yarn build:native\` (requires a Rust toolchain).\n` +
    (loadError ? `Original error: ${loadError.message}` : "");
  throw new Error(errorMsg);
}

module.exports = {
  compileCss: nativeBinding.compileCss,
  transformJsx: nativeBinding.transformJsx,
  resolveRuntimeStyles: nativeBinding.resolveRuntimeStyles,
};
