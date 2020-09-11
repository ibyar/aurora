
export interface TypeOf<T> extends Function {
    new(...values: any): T;
}

export interface HTMLType extends TypeOf<HTMLElement> {
    prototype: HTMLElement;
}

export type TemplateUrl = { filename?: string; meta: { url: string } };
