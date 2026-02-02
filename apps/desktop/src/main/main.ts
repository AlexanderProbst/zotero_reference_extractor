import type { App, BrowserWindow as BW, NativeTheme, WebContents } from 'electron';
import { join } from 'node:path';
import { registerIpcHandlers } from './ipc';

// Use require for Electron to work around ESM interop issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const electron = require('electron');
const app: App = electron.app;
const BrowserWindow: typeof BW = electron.BrowserWindow;
const nativeTheme: NativeTheme = electron.nativeTheme;

// Determine if we're in development mode
const isDev = !app.isPackaged;

let mainWindow: BW | null = null;

/**
 * Create the main application window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    title: 'Zotero Ref Extractor',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle handlers
app.whenReady().then(() => {
  // Register IPC handlers before creating the window
  registerIpcHandlers();

  createWindow();

  // On macOS, re-create window when dock icon is clicked and no windows exist
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (_event: Electron.Event, contents: WebContents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});
