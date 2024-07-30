export default function CssVars(): this;
export default class CssVars {
    global: {};
    data: {};
    setGlobal: (declarations: any, { width, height }?: {
        width: any;
        height: any;
    }) => void;
    getGlobal: () => {};
    set: (selector: any, declarations: any, { width, height }?: {
        width: any;
        height: any;
    }) => void;
    get: (selector: any) => any;
    isVar: (property: any) => boolean;
    injectVar: (selector: any, value: any) => any;
}
