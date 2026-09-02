const { existsSync, readFileSync } = require("fs");
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
for (const file of getCandidateFilenames()) {
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
  // If no candidate succeeded, try direct require of fallback
  try {
    nativeBinding = require("./transformer.node");
  } catch (e) {
    const errorMsg =
      `Failed to load native binding for @colorye/react-native-css on ${platform}-${arch}.\n` +
      `Ensure that transformer.node or transformer.${platform}-${arch}.node exists in ${__dirname}.\n` +
      (loadError ? `Original error: ${loadError.message}` : "");
    throw new Error(errorMsg);
  }
}

module.exports = {
  transformJsx: nativeBinding.transformJsx,
  resolveRuntimeStyles: nativeBinding.resolveRuntimeStyles,
};
