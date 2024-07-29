import { camelize } from "../utils/helper";
import CssTransform from "./css-transform";

const SUPPORTED_MEDIA_TYPE = [
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "prefers-color-scheme",
];

export default function CssMedia() {
  const transform = new CssTransform();

  this.match = (media, { width, height, colorScheme } = {}) => {
    const isMedia = media.startsWith("@media");
    if (!isMedia) return [false];

    let isValidMedia = true;
    const widthRange = [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
    const heightRange = [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];

    const mediaGroupsRe = /\([^)]*\)/g;
    const mediaGroups = media.match(mediaGroupsRe)?.map((rawGroup) => {
      const mediaGroupRe = /\(\s*([^:)\s]+)\s*:\s*([^:)\s]+)\s*\)/g;
      let [, mediaType, mediaValue] = mediaGroupRe.exec(rawGroup) || [];

      if (!SUPPORTED_MEDIA_TYPE.includes(mediaType)) {
        isValidMedia = false;
        return null;
      }

      mediaType = camelize(mediaType);

      mediaValue = transform.transformUnsupportedUnit(mediaValue);
      mediaValue = transform.transformViewportUnit(mediaValue, { width, height });
      mediaValue = transform.removeUnit(mediaValue);

      if (mediaType === "minWidth") {
        widthRange[0] = mediaValue;
      } else if (mediaType === "minHeight") {
        heightRange[0] = mediaValue;
      } else if (mediaType === "maxWidth") {
        widthRange[1] = mediaValue;
      } else if (mediaType === "maxHeight") {
        heightRange[1] = mediaValue;
      }

      return [mediaType, mediaValue];
    });
    if (!Array.isArray(mediaGroups) || mediaGroups.length === 0) {
      isValidMedia = false;
    }
    if (!isValidMedia) return [true, false];

    if (mediaGroups[0][0] === "prefersColorScheme" && mediaGroups[0][1] === "dark") {
      if (colorScheme === "dark") {
        return [true, true];
      } else {
        return [true, false];
      }
    }

    const isValidRange = widthRange[0] <= widthRange[1] && heightRange[0] <= heightRange[1];
    if (!isValidRange) return [true, false];

    const isMatchedMedia =
      widthRange[0] <= width &&
      width <= widthRange[1] &&
      heightRange[0] <= height &&
      height <= heightRange[1];
    if (!isMatchedMedia) return [true, false];

    return [true, true];
  };

  return this;
}
