import React, { useEffect } from 'react';
import { FileDrop } from './components/FileDrop';
import { OptionsForm } from './components/OptionsForm';
import { ProgressLog } from './components/ProgressLog';
import { Summary } from './components/Summary';
import { useAppStore } from './lib/state';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  extractButton: {
    padding: '10px 24px',
    fontSize: '15px',
    fontWeight: 500,
    backgroundColor: 'var(--accent-color)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  extractButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  secondaryButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  statusText: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
    marginLeft: 'auto',
  },
  errorText: {
    color: 'var(--error-color)',
    fontSize: '14px',
    padding: '12px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '6px',
    border: '1px solid var(--error-color)',
  },
};

export default function App() {
  const {
    files,
    isExtracting,
    result,
    error,
    logs,
    setFiles,
    addLog,
    clearLogs,
    setIsExtracting,
    setResult,
    setError,
    options,
  } = useAppStore();

  // Subscribe to log messages from main process
  useEffect(() => {
    const unsubscribe = window.api.onLog((message) => {
      addLog(message);
    });
    return unsubscribe;
  }, [addLog]);

  const handleExtract = async () => {
    if (files.length === 0 || isExtracting) return;

    clearLogs();
    setResult(null);
    setError(null);
    setIsExtracting(true);

    try {
      const response = await window.api.extract({
        files: files.map((f) => f.path),
        format: options.format,
        grobidUrl: options.grobidUrl || undefined,
        minify: options.minify,
        failOnEmpty: options.failOnEmpty,
        logLevel: options.logLevel,
      });

      if (response.success) {
        setResult(response);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;

    const saveResult = await window.api.saveDialog({
      defaultFileName: result.outputSuggestedName,
      data: result.output,
    });

    if (saveResult.error) {
      setError(`Failed to save: ${saveResult.error}`);
    } else if (saveResult.filePath) {
      addLog(`Saved to: ${saveResult.filePath}`);
    }
  };

  const handleCopy = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result.output);
      addLog('Copied to clipboard');
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const canExtract = files.length > 0 && !isExtracting;
  const hasResult = result !== null;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Zotero Ref Extractor</h1>
        <p style={styles.subtitle}>
          Extract bibliographic references from Word documents and PDFs
        </p>
      </header>

      <main style={styles.main}>
        <FileDrop files={files} onFilesChange={setFiles} disabled={isExtracting} />

        <OptionsForm disabled={isExtracting} />

        <div style={styles.actions}>
          <button
            style={{
              ...styles.extractButton,
              ...(canExtract ? {} : styles.extractButtonDisabled),
            }}
            onClick={handleExtract}
            disabled={!canExtract}
          >
            {isExtracting ? 'Extracting...' : 'Extract References'}
          </button>

          {hasResult && (
            <>
              <button style={styles.secondaryButton} onClick={handleSave}>
                Save...
              </button>
              <button style={styles.secondaryButton} onClick={handleCopy}>
                Copy to Clipboard
              </button>
            </>
          )}

          {isExtracting && <span style={styles.statusText}>Processing...</span>}
        </div>

        {error && <div style={styles.errorText}>{error}</div>}

        {hasResult && <Summary result={result} />}

        <ProgressLog logs={logs} />
      </main>
    </div>
  );
}
