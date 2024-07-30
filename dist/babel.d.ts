export default function _default({ types: t }: {
    types: any;
}): {
    name: string;
    visitor: {
        Program: {
            enter(path: any, state: any): void;
            exit(path: any, state: any): void;
        };
        JSXElement(path: any, state: any): void;
    };
};
