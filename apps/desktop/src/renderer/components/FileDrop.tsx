import React, { useState, useCallback, DragEvent } from 'react';
import { FileEntry } from '../lib/state';

interface FileDropProps {
  files: FileEntry[];
  onFilesChange: (files: FileEntry[]) => void;
  disabled?: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  dropZone: {
    border: '2px dashed var(--border-color)',
    borderRadius: '8px',
    padding: '32px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: 'var(--bg-secondary)',
  },
  dropZoneActive: {
    borderColor: 'var(--drop-zone-border)',
    backgroundColor: 'var(--drop-zone-active-bg)',
  },
  dropZoneDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  dropIcon: {
    fontSize: '32px',
    marginBottom: '8px',
    opacity: 0.6,
  },
  dropText: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    marginBottom: '8px',
  },
  dropSubtext: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  browseLink: {
    color: 'var(--accent-color)',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  fileList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
  },
  fileIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
  fileName: {
    flex: 1,
    fontSize: '14px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  filePath: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '300px',
  },
  removeButton: {
    padding: '4px 8px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  clearButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
};

/**
 * Get file icon based on extension
 */
function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'docx':
      return '\uD83D\uDCC4'; // Document icon
    case 'pdf':
      return '\uD83D\uDCD5'; // Book icon (PDF-ish)
    default:
      return '\uD83D\uDCC1'; // Folder icon
  }
}

/**
 * Get display name from path
 */
function getDisplayName(path: string): string {
  // Handle both Windows and Unix paths
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

export function FileDrop({ files, onFilesChange, disabled = false }: FileDropProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = droppedFiles
        .filter((f) => {
          const ext = f.name.split('.').pop()?.toLowerCase();
          return ext === 'docx' || ext === 'pdf';
        })
        .map((f) => ({
          // Note: In Electron, File objects from drag-drop have a 'path' property
          path: (f as File & { path?: string }).path || f.name,
          name: f.name,
        }));

      if (validFiles.length > 0) {
        const existingPaths = new Set(files.map((f) => f.path));
        const newFiles = validFiles.filter((f) => !existingPaths.has(f.path));
        onFilesChange([...files, ...newFiles]);
      }
    },
    [files, onFilesChange, disabled]
  );

  const handleBrowse = useCallback(async () => {
    if (disabled) return;

    const selectedPaths = await window.api.openFileDialog();
    if (selectedPaths.length > 0) {
      const newFiles = selectedPaths.map((path) => ({
        path,
        name: getDisplayName(path),
      }));
      const existingPaths = new Set(files.map((f) => f.path));
      const uniqueFiles = newFiles.filter((f) => !existingPaths.has(f.path));
      onFilesChange([...files, ...uniqueFiles]);
    }
  }, [files, onFilesChange, disabled]);

  const handleRemove = useCallback(
    (path: string) => {
      onFilesChange(files.filter((f) => f.path !== path));
    },
    [files, onFilesChange]
  );

  const handleClear = useCallback(() => {
    onFilesChange([]);
  }, [onFilesChange]);

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.dropZone,
          ...(isDragActive ? styles.dropZoneActive : {}),
          ...(disabled ? styles.dropZoneDisabled : {}),
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={disabled ? undefined : handleBrowse}
      >
        <div style={styles.dropIcon}>{'\uD83D\uDCC2'}</div>
        <div style={styles.dropText}>
          Drag and drop files here, or{' '}
          <span style={styles.browseLink}>browse</span>
        </div>
        <div style={styles.dropSubtext}>Accepts .docx and .pdf files</div>
      </div>

      {files.length > 0 && (
        <>
          <div style={styles.fileList}>
            {files.map((file) => (
              <div key={file.path} style={styles.fileItem}>
                <span style={styles.fileIcon}>{getFileIcon(file.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.fileName}>{file.name}</div>
                  <div style={styles.filePath} title={file.path}>
                    {file.path}
                  </div>
                </div>
                <button
                  style={styles.removeButton}
                  onClick={() => handleRemove(file.path)}
                  disabled={disabled}
                  title="Remove"
                >
                  {'\u2715'}
                </button>
              </div>
            ))}
          </div>
          <button
            style={styles.clearButton}
            onClick={handleClear}
            disabled={disabled}
          >
            Clear all
          </button>
        </>
      )}
    </div>
  );
}
