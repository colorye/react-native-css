export default function CssTransform(): this;
export default class CssTransform {
    transformUnsafeValue: (property: any, value: any) => any[];
    transformUnsupportedUnit: (value: any) => any;
    transformViewportUnit: (value: any, { width, height }?: {
        width: any;
        height: any;
    }) => any;
    removeUnit: (value: any) => any;
    isPropertySupported: (property: any, value: any) => boolean;
    transformImportant: (property: any, value: any) => any;
    transformPosition: (property: any, value: any) => any;
    transformBorderRadius: (property: any, value: any) => any;
    transform: (property: any, value: any) => {} | undefined;
    transformBorder: (property: any, value: any) => {};
    transformSpacing: (property: any, value: any) => {};
    transformFontWeight: (property: any, value: any) => {
        [x: number]: any;
    } | undefined;
    transformTransform: (property: any, value: any) => {
        [x: number]: {
            [x: string]: string | number;
        }[];
    };
    getAliasedPropertyName: (property: any) => any;
}
