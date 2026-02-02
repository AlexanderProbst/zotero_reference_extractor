import React, { useRef, useEffect, useState } from 'react';

interface ProgressLogProps {
  logs: string[];
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 0',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    border: 'none',
    background: 'none',
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  clearButton: {
    padding: '4px 8px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  logContainer: {
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  logContent: {
    padding: '12px',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: '12px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  logLine: {
    margin: 0,
    padding: 0,
    color: 'var(--text-secondary)',
  },
  emptyState: {
    padding: '16px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '13px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '18px',
    height: '18px',
    padding: '0 6px',
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: 'var(--accent-color)',
    color: '#ffffff',
    borderRadius: '9px',
    marginLeft: '6px',
  },
};

export function ProgressLog({ logs }: ProgressLogProps) {
  const [isOpen, setIsOpen] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current && isOpen) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  // Auto-open when logs arrive
  useEffect(() => {
    if (logs.length > 0) {
      setIsOpen(true);
    }
  }, [logs.length]);

  if (logs.length === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.toggle} onClick={() => setIsOpen(!isOpen)}>
          <span>{isOpen ? '\u25BC' : '\u25B6'}</span>
          <span>Console</span>
          {!isOpen && logs.length > 0 && (
            <span style={styles.badge}>{logs.length}</span>
          )}
        </button>
      </div>

      {isOpen && (
        <div style={styles.logContainer} ref={logContainerRef}>
          <div style={styles.logContent}>
            {logs.map((log, index) => (
              <p key={index} style={styles.logLine}>
                {log}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
