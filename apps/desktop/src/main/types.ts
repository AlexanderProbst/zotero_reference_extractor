import { z } from 'zod';

/**
 * Output format options matching the core library
 */
export const OutputFormatSchema = z.enum(['csl', 'biblatex', 'bibtex', 'ris']);
export type OutputFormat = z.infer<typeof OutputFormatSchema>;

/**
 * Log level options
 */
export const LogLevelSchema = z.enum(['silent', 'info', 'debug']);
export type LogLevel = z.infer<typeof LogLevelSchema>;

/**
 * Extraction request payload from renderer
 */
export const ExtractRequestSchema = z.object({
  files: z.array(z.string()).min(1, 'At least one file is required'),
  format: OutputFormatSchema.default('csl'),
  grobidUrl: z.string().url().optional(),
  minify: z.boolean().default(false),
  failOnEmpty: z.boolean().default(false),
  logLevel: LogLevelSchema.default('info'),
});
export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;

/**
 * Extraction result summary
 */
export interface ExtractSummary {
  totalInputs: number;
  totalItems: number;
  dedupedItems: number;
  warnings: string[];
}

/**
 * Full extraction result returned to renderer
 */
export interface ExtractResult {
  success: true;
  summary: ExtractSummary;
  output: string;
  outputSuggestedName: string;
}

/**
 * Error result
 */
export interface ExtractError {
  success: false;
  error: string;
  details?: string;
}

export type ExtractResponse = ExtractResult | ExtractError;

/**
 * Save dialog request
 */
export interface SaveDialogRequest {
  defaultFileName: string;
  data: string;
}

/**
 * Save dialog result
 */
export interface SaveDialogResult {
  filePath: string | null;
  error?: string;
}

/**
 * IPC channel names
 */
export const IPC_CHANNELS = {
  EXTRACT_RUN: 'extract:run',
  SAVE_DIALOG: 'save:dialog',
  OPEN_FILE_DIALOG: 'dialog:openFiles',
  LOG_MESSAGE: 'log:message',
} as const;

/**
 * Preload API exposed to renderer via contextBridge
 */
export interface PreloadAPI {
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
