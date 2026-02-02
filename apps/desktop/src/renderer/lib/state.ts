import { create } from 'zustand';

/**
 * File entry with path and display name
 */
export interface FileEntry {
  path: string;
  name: string;
}

/**
 * Output format options
 */
export type OutputFormat = 'csl' | 'biblatex' | 'bibtex' | 'ris';

/**
 * Log level options
 */
export type LogLevel = 'silent' | 'info' | 'debug';

/**
 * Form options
 */
export interface FormOptions {
  format: OutputFormat;
  grobidUrl: string;
  minify: boolean;
  failOnEmpty: boolean;
  logLevel: LogLevel;
}

/**
 * Extraction result from the main process
 */
export interface ExtractResult {
  success: true;
  summary: {
    totalInputs: number;
    totalItems: number;
    dedupedItems: number;
    warnings: string[];
  };
  output: string;
  outputSuggestedName: string;
}

/**
 * App store state
 */
interface AppState {
  // File management
  files: FileEntry[];
  setFiles: (files: FileEntry[]) => void;
  addFiles: (files: FileEntry[]) => void;
  removeFile: (path: string) => void;
  clearFiles: () => void;

  // Form options
  options: FormOptions;
  setOption: <K extends keyof FormOptions>(key: K, value: FormOptions[K]) => void;

  // Extraction state
  isExtracting: boolean;
  setIsExtracting: (value: boolean) => void;

  // Result
  result: ExtractResult | null;
  setResult: (result: ExtractResult | null) => void;

  // Error
  error: string | null;
  setError: (error: string | null) => void;

  // Logs
  logs: string[];
  addLog: (message: string) => void;
  clearLogs: () => void;

  // UI state
  advancedOpen: boolean;
  setAdvancedOpen: (open: boolean) => void;
}

/**
 * Default form options
 */
const defaultOptions: FormOptions = {
  format: 'csl',
  grobidUrl: '',
  minify: false,
  failOnEmpty: false,
  logLevel: 'info',
};

/**
 * App store using zustand
 */
export const useAppStore = create<AppState>((set) => ({
  // Files
  files: [],
  setFiles: (files) => set({ files }),
  addFiles: (newFiles) =>
    set((state) => {
      // Deduplicate by path
      const existingPaths = new Set(state.files.map((f) => f.path));
      const uniqueNewFiles = newFiles.filter((f) => !existingPaths.has(f.path));
      return { files: [...state.files, ...uniqueNewFiles] };
    }),
  removeFile: (path) =>
    set((state) => ({
      files: state.files.filter((f) => f.path !== path),
    })),
  clearFiles: () => set({ files: [] }),

  // Options
  options: defaultOptions,
  setOption: (key, value) =>
    set((state) => ({
      options: { ...state.options, [key]: value },
    })),

  // Extraction
  isExtracting: false,
  setIsExtracting: (value) => set({ isExtracting: value }),

  // Result
  result: null,
  setResult: (result) => set({ result }),

  // Error
  error: null,
  setError: (error) => set({ error }),

  // Logs
  logs: [],
  addLog: (message) =>
    set((state) => ({
      logs: [...state.logs, message],
    })),
  clearLogs: () => set({ logs: [] }),

  // UI
  advancedOpen: false,
  setAdvancedOpen: (open) => set({ advancedOpen: open }),
}));
