import { contextBridge, ipcRenderer } from 'electron';

// IPC channel names - inlined because sandbox mode can't require local files
const IPC_CHANNELS = {
  EXTRACT_RUN: 'extract:run',
  SAVE_DIALOG: 'save:dialog',
  OPEN_FILE_DIALOG: 'dialog:openFiles',
  LOG_MESSAGE: 'log:message',
} as const;

// Type definitions (TypeScript only - erased at runtime)
// These mirror types.ts but don't require zod
type OutputFormat = 'csl' | 'biblatex' | 'bibtex' | 'ris';
type LogLevel = 'silent' | 'info' | 'debug';

interface ExtractRequest {
  files: string[];
  format: OutputFormat;
  grobidUrl?: string;
  minify?: boolean;
  failOnEmpty?: boolean;
  logLevel?: LogLevel;
}

interface ExtractSummary {
  totalInputs: number;
  totalItems: number;
  dedupedItems: number;
  warnings: string[];
}

interface ExtractResult {
  success: true;
  summary: ExtractSummary;
  output: string;
  outputSuggestedName: string;
}

interface ExtractError {
  success: false;
  error: string;
  details?: string;
}

type ExtractResponse = ExtractResult | ExtractError;

interface SaveDialogRequest {
  defaultFileName: string;
  data: string;
}

interface SaveDialogResult {
  filePath: string | null;
  error?: string;
}

interface PreloadAPI {
  extract: (payload: ExtractRequest) => Promise<ExtractResponse>;
  saveDialog: (request: SaveDialogRequest) => Promise<SaveDialogResult>;
  openFileDialog: () => Promise<string[]>;
  onLog: (callback: (message: string) => void) => () => void;
}

/**
 * Exposed API for the renderer process
 */
const api: PreloadAPI = {
  /**
   * Run the extraction process
   */
  extract: (payload: ExtractRequest): Promise<ExtractResponse> => {
    return ipcRenderer.invoke(IPC_CHANNELS.EXTRACT_RUN, payload);
  },

  /**
   * Open a save dialog and write data to the selected file
   */
  saveDialog: (request: SaveDialogRequest): Promise<SaveDialogResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SAVE_DIALOG, request);
  },

  /**
   * Open a file dialog to select input files
   */
  openFileDialog: (): Promise<string[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE_DIALOG);
  },

  /**
   * Subscribe to log messages from the main process
   * Returns an unsubscribe function
   */
  onLog: (callback: (message: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, message: string) => {
      callback(message);
    };

    ipcRenderer.on(IPC_CHANNELS.LOG_MESSAGE, handler);

    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.LOG_MESSAGE, handler);
    };
  },
};

// Expose the API to the renderer via contextBridge
contextBridge.exposeInMainWorld('api', api);
