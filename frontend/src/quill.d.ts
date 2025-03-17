declare module 'quill' {
  export interface DeltaStatic {
    ops: Array<{
      insert?: any;
      delete?: number;
      retain?: number;
      attributes?: { [key: string]: any };
    }>;
    retain(length: number, attributes?: { [key: string]: any }): DeltaStatic;
    delete(length: number): DeltaStatic;
    insert(text: any, attributes?: { [key: string]: any }): DeltaStatic;
    filter(predicate: (op: any) => boolean): DeltaStatic;
    forEach(predicate: (op: any) => void): void;
    map<T>(predicate: (op: any) => T): T[];
    partition(predicate: (op: any) => boolean): [DeltaStatic, DeltaStatic];
  }

  export default class Quill {
    constructor(container: string | Element, options?: any);
    container: Element;
    root: Element;
    scroll: any;
    clipboard: any;
    editor: any;
    theme: any;
    static register(path: string, def: any, suppressWarning?: boolean): any;
    static extend(name: string, prototype: any): any;
    static imports(path: string): any;
    static find(domNode: Node): Quill;
    addContainer(className: string, refNode?: Node): HTMLDivElement;
    blur(): void;
    deleteText(index: number, length: number, source?: string): DeltaStatic;
    disable(): void;
    enable(enabled?: boolean): void;
    focus(): void;
    format(name: string, value: any, source?: string): DeltaStatic;
    formatLine(index: number, length: number, name: string, value: any, source?: string): DeltaStatic;
    formatLine(index: number, length: number, formats: any, source?: string): DeltaStatic;
    formatText(index: number, length: number, name: string, value: any, source?: string): DeltaStatic;
    formatText(index: number, length: number, formats: any, source?: string): DeltaStatic;
    getBounds(index: number, length?: number): any;
    getContents(index?: number, length?: number): DeltaStatic;
    getFormat(index?: number, length?: number): any;
    getIndex(blot: any): number;
    getLeaf(index: number): any;
    getLength(): number;
    getLine(index: number): [any, number];
    getLines(index?: number, length?: number): any[];
    getModule(name: string): any;
    getSelection(focus?: boolean): { index: number; length: number };
    getText(index?: number, length?: number): string;
    hasFocus(): boolean;
    insertEmbed(index: number, type: string, value: any, source?: string): DeltaStatic;
    insertText(index: number, text: string, source?: string): DeltaStatic;
    insertText(index: number, text: string, name: string, value: any, source?: string): DeltaStatic;
    insertText(index: number, text: string, formats: any, source?: string): DeltaStatic;
    off(eventName: string, listener: Function): Quill;
    on(eventName: string, listener: Function): Quill;
    once(eventName: string, listener: Function): Quill;
    removeFormat(index: number, length: number, source?: string): DeltaStatic;
    setContents(delta: DeltaStatic, source?: string): DeltaStatic;
    setSelection(index: number, length: number, source?: string): Quill;
    setSelection(range: { index: number; length: number }, source?: string): Quill;
    setText(text: string, source?: string): DeltaStatic;
    update(source?: string): void;
    updateContents(delta: DeltaStatic, source?: string): DeltaStatic;
  }
}
