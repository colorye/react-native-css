export default function CssMedia(): this;
export default class CssMedia {
    match: (media: any, { width, height, colorScheme }?: {
        width: any;
        height: any;
        colorScheme: any;
    }) => boolean[];
}
