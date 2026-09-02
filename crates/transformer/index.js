const { existsSync, readFileSync } = require("fs");
const { join } = require("path");

const { platform, arch } = process;

let nativeBinding = null;
let localFileExisted = false;
let loadError = null;

function isMusl() {
  // For Node 10
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

switch (platform) {
  case "android":
    switch (arch) {
      case "arm64":
        localFileExisted = existsSync(join(__dirname, "transformer.android-arm64.node"));
        try {
          if (localFileExisted) {
            nativeBinding = require("./transformer.android-arm64.node");
          } else {
            nativeBinding = require("@colorye/react-native-css-android-arm64");
          }
        } catch (e) {
          loadError = e;
        }
        break;
      case "arm":
        localFileExisted = existsSync(join(__dirname, "transformer.android-arm-eabi.node"));
        try {
          if (localFileExisted) {
            nativeBinding = require("./transformer.android-arm-eabi.node");
          } else {
            nativeBinding = require("@colorye/react-native-css-android-arm-eabi");
          }
        } catch (e) {
          loadError = e;
        }
        break;
      default:
        throw new Error(`Unsupported architecture on Android ${arch}`);
    }
    break;
  case "win32":
    switch (arch) {
      case "x64":
        localFileExisted = existsSync(join(__dirname, "transformer.win32-x64-msvc.node"));
        try {
          if (localFileExisted) {
            nativeBinding = require("./transformer.win32-x64-msvc.node");
          } else {
            nativeBinding = require("@colorye/react-native-css-win32-x64-msvc");
          }
        } catch (e) {
          loadError = e;
        }
        break;
      case "arm64":
        localFileExisted = existsSync(join(__dirname, "transformer.win32-arm64-msvc.node"));
        try {
          if (localFileExisted) {
            nativeBinding = require("./transformer.win32-arm64-msvc.node");
          } else {
            nativeBinding = require("@colorye/react-native-css-win32-arm64-msvc");
          }
        } catch (e) {
          loadError = e;
        }
        break;
      default:
        throw new Error(`Unsupported architecture on Windows: ${arch}`);
    }
    break;
  case "darwin":
    localFileExisted = existsSync(join(__dirname, "transformer.darwin-universal.node"));
    try {
      if (localFileExisted) {
        nativeBinding = require("./transformer.darwin-universal.node");
      } else {
        nativeBinding = require("@colorye/react-native-css-darwin-universal");
      }
      break;
    } catch {}
    switch (arch) {
      case "x64":
        localFileExisted = existsSync(join(__dirname, "transformer.darwin-x64.node"));
        try {
          if (localFileExisted) {
            nativeBinding = require("./transformer.darwin-x64.node");
          } else {
            nativeBinding = require("@colorye/react-native-css-darwin-x64");
          }
        } catch (e) {
          loadError = e;
        }
        break;
      case "arm64":
        localFileExisted = existsSync(join(__dirname, "transformer.darwin-arm64.node"));
        try {
          if (localFileExisted) {
            nativeBinding = require("./transformer.darwin-arm64.node");
          } else {
            nativeBinding = require("@colorye/react-native-css-darwin-arm64");
          }
        } catch (e) {
          loadError = e;
        }
        break;
      default:
        throw new Error(`Unsupported architecture on macOS: ${arch}`);
    }
    break;
  case "freebsd":
    if (arch !== "x64") {
      throw new Error(`Unsupported architecture on FreeBSD: ${arch}`);
    }
    localFileExisted = existsSync(join(__dirname, "transformer.freebsd-x64.node"));
    try {
      if (localFileExisted) {
        nativeBinding = require("./transformer.freebsd-x64.node");
      } else {
        nativeBinding = require("@colorye/react-native-css-freebsd-x64");
      }
    } catch (e) {
      loadError = e;
    }
    break;
  case "linux":
    switch (arch) {
      case "x64":
        if (isMusl()) {
          localFileExisted = existsSync(join(__dirname, "transformer.linux-x64-musl.node"));
          try {
            if (localFileExisted) {
              nativeBinding = require("./transformer.linux-x64-musl.node");
            } else {
              nativeBinding = require("@colorye/react-native-css-linux-x64-musl");
            }
          } catch (e) {
            loadError = e;
          }
        } else {
          localFileExisted = existsSync(join(__dirname, "transformer.linux-x64-gnu.node"));
          try {
            if (localFileExisted) {
              nativeBinding = require("./transformer.linux-x64-gnu.node");
            } else {
              nativeBinding = require("@colorye/react-native-css-linux-x64-gnu");
            }
          } catch (e) {
            loadError = e;
          }
        }
        break;
      case "arm64":
        if (isMusl()) {
          localFileExisted = existsSync(join(__dirname, "transformer.linux-arm64-musl.node"));
          try {
            if (localFileExisted) {
              nativeBinding = require("./transformer.linux-arm64-musl.node");
            } else {
              nativeBinding = require("@colorye/react-native-css-linux-arm64-musl");
            }
          } catch (e) {
            loadError = e;
          }
        } else {
          localFileExisted = existsSync(join(__dirname, "transformer.linux-arm64-gnu.node"));
          try {
            if (localFileExisted) {
              nativeBinding = require("./transformer.linux-arm64-gnu.node");
            } else {
              nativeBinding = require("@colorye/react-native-css-linux-arm64-gnu");
            }
          } catch (e) {
            loadError = e;
          }
        }
        break;
      default:
        throw new Error(`Unsupported architecture on Linux: ${arch}`);
    }
    break;
  default:
    throw new Error(`Unsupported OS: ${platform}, architecture: ${arch}`);
}

if (!nativeBinding) {
  // Local development fallback
  try {
    nativeBinding = require("./transformer.node");
  } catch (e) {
    if (loadError) {
      throw loadError;
    }
    throw e;
  }
}

module.exports = {
  transformJsx: nativeBinding.transformJsx,
  resolveRuntimeStyles: nativeBinding.resolveRuntimeStyles,
};
