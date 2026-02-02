import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  ExtractRequest,
  ExtractResponse,
  SaveDialogRequest,
  SaveDialogResult,
  PreloadAPI,
} from './types.js';

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
