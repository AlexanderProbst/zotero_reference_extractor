/// <reference types="vite/client" />

/**
 * Output format options
 */
type OutputFormat = 'csl' | 'biblatex' | 'bibtex' | 'ris';

/**
 * Log level options
 */
type LogLevel = 'silent' | 'info' | 'debug';

/**
 * Extraction request payload from renderer
 */
interface ExtractRequest {
  files: string[];
  format: OutputFormat;
  grobidUrl?: string;
  minify?: boolean;
  failOnEmpty?: boolean;
  logLevel?: LogLevel;
}

/**
 * Extraction result summary
 */
interface ExtractSummary {
  totalInputs: number;
  totalItems: number;
  dedupedItems: number;
  warnings: string[];
}

/**
 * Full extraction result returned to renderer
 */
interface ExtractResult {
  success: true;
  summary: ExtractSummary;
  output: string;
  outputSuggestedName: string;
}

/**
 * Error result
 */
interface ExtractError {
  success: false;
  error: string;
  details?: string;
}

type ExtractResponse = ExtractResult | ExtractError;

/**
 * Save dialog request
 */
interface SaveDialogRequest {
  defaultFileName: string;
  data: string;
}

/**
 * Save dialog result
 */
interface SaveDialogResult {
  filePath: string | null;
  error?: string;
}

/**
 * Preload API exposed to renderer via contextBridge
 */
interface PreloadAPI {
  extract: (payload: ExtractRequest) => Promise<ExtractResponse>;
  saveDialog: (request: SaveDialogRequest) => Promise<SaveDialogResult>;
  openFileDialog: () => Promise<string[]>;
  onLog: (callback: (message: string) => void) => () => void;
}

declare global {
  interface Window {
    api: PreloadAPI;
  }
}

export {};
