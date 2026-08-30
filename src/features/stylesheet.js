import { precomputeDeclaration } from "./build-transform";

export default function Stylesheet() {
  this.rawStylesheet = {};
  this.stylesheet = {};

  this.setRawStylesheet = (raw) => {
    this.rawStylesheet = raw;
  };

  this.finalize = () => {
    for (const [selector, rawDecl] of Object.entries(this.rawStylesheet)) {
      const { _static, _dynamic, _hasDynamic } = precomputeDeclaration(rawDecl);

      if (_hasDynamic) {
        this.stylesheet[selector] = { _static, _dynamic };
      } else {
        this.stylesheet[selector] = _static;
      }
    }
  };

  this.toJSON = () => {
    this.finalize();
    return JSON.stringify(this.stylesheet);
  };

  return this;
}
