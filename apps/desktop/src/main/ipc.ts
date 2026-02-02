import { ipcMain, dialog, BrowserWindow } from 'electron';
import { writeFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import {
  IPC_CHANNELS,
  ExtractRequestSchema,
  ExtractRequest,
  ExtractResponse,
  SaveDialogRequest,
  SaveDialogResult,
} from './types.js';
import { runExtraction } from './adapters.js';

/**
 * Send a log message to the renderer
 */
function sendLog(window: BrowserWindow | null, message: string): void {
  if (window && !window.isDestroyed()) {
    window.webContents.send(IPC_CHANNELS.LOG_MESSAGE, message);
  }
}

/**
 * Register all IPC handlers
 */
export function registerIpcHandlers(): void {
  // Handle extraction requests
  ipcMain.handle(
    IPC_CHANNELS.EXTRACT_RUN,
    async (event, payload: unknown): Promise<ExtractResponse> => {
      const window = BrowserWindow.fromWebContents(event.sender);

      // Validate the payload
      const parseResult = ExtractRequestSchema.safeParse(payload);
      if (!parseResult.success) {
        return {
          success: false,
          error: 'Invalid request payload',
          details: parseResult.error.issues.map((i) => i.message).join('; '),
        };
      }

      const request: ExtractRequest = parseResult.data;
      const logger = (msg: string) => sendLog(window, msg);

      try {
        logger(`Starting extraction of ${request.files.length} file(s)...`);
        const result = await runExtraction(request, logger);
        logger('Extraction complete.');
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger(`Error: ${message}`);
        return {
          success: false,
          error: message,
        };
      }
    }
  );

  // Handle save dialog requests
  ipcMain.handle(
    IPC_CHANNELS.SAVE_DIALOG,
    async (event, request: SaveDialogRequest): Promise<SaveDialogResult> => {
      const window = BrowserWindow.fromWebContents(event.sender);

      // Determine file filter based on extension
      const ext = extname(request.defaultFileName).toLowerCase();
      const filters = getFiltersForExtension(ext);

      try {
        const result = await dialog.showSaveDialog(window!, {
          defaultPath: request.defaultFileName,
          filters,
        });

        if (result.canceled || !result.filePath) {
          return { filePath: null };
        }

        // Write the file
        await writeFile(result.filePath, request.data, 'utf-8');

        return { filePath: result.filePath };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { filePath: null, error: message };
      }
    }
  );

  // Handle open file dialog
  ipcMain.handle(IPC_CHANNELS.OPEN_FILE_DIALOG, async (event): Promise<string[]> => {
    const window = BrowserWindow.fromWebContents(event.sender);

    const result = await dialog.showOpenDialog(window!, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Documents', extensions: ['docx', 'pdf'] },
        { name: 'Word Documents', extensions: ['docx'] },
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    return result.canceled ? [] : result.filePaths;
  });
}

/**
 * Get file dialog filters based on extension
 */
function getFiltersForExtension(ext: string): Electron.FileFilter[] {
  switch (ext) {
    case '.json':
      return [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ];
    case '.bib':
      return [
        { name: 'BibTeX Files', extensions: ['bib'] },
        { name: 'All Files', extensions: ['*'] },
      ];
    case '.ris':
      return [
        { name: 'RIS Files', extensions: ['ris'] },
        { name: 'All Files', extensions: ['*'] },
      ];
    default:
      return [{ name: 'All Files', extensions: ['*'] }];
  }
}
