declare module 'yauzl-promise' {
  import { Readable } from 'stream';

  interface Entry {
    fileName: string;
    filename: string;
    uncompressedSize: number;
    compressedSize: number;
    openReadStream(): Promise<Readable>;
  }

  interface ZipFile extends AsyncIterable<Entry> {
    close(): Promise<void>;
    entryCount: number;
  }

  interface OpenOptions {
    lazyEntries?: boolean;
    decodeStrings?: boolean;
    validateEntrySizes?: boolean;
    strictFileNames?: boolean;
  }

  export function open(path: string, options?: OpenOptions): Promise<ZipFile>;
  export function fromBuffer(buffer: Buffer, options?: OpenOptions): Promise<ZipFile>;
}
