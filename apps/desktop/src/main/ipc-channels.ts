/**
 * IPC channel names - shared between main and preload
 * This file has no dependencies so it can be used in sandbox mode
 */
export const IPC_CHANNELS = {
  EXTRACT_RUN: 'extract:run',
  SAVE_DIALOG: 'save:dialog',
  OPEN_FILE_DIALOG: 'dialog:openFiles',
  LOG_MESSAGE: 'log:message',
} as const;
