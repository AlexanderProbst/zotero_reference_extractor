declare module 'citation-js' {
  interface CiteFormatOptions {
    format?: 'text' | 'html' | 'object';
    template?: string;
    lang?: string;
  }

  class Cite {
    constructor(data?: unknown);
    static plugins: Record<string, unknown>;
    format(type: string, options?: CiteFormatOptions): string;
    get(options?: Record<string, unknown>): unknown[];
    add(data: unknown): this;
    set(data: unknown): this;
    data: unknown[];
  }

  export default Cite;
}
