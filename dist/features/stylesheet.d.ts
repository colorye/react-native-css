export default function Stylesheet(): this;
export default class Stylesheet {
    stylesheet: {};
    isRuleTypeSupported: (type: any) => boolean;
    isSelectorSupported: (selector: any) => boolean;
    simplifyDeclarations: (declarations: any) => any;
    upsert: (selector: any, declarations: any) => void;
    toJSON: () => string;
}
