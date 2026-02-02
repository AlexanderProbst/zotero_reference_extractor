import React, { useState } from 'react';
import { ExtractResult } from '../lib/state';

interface SummaryProps {
  result: ExtractResult;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  statsCard: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    padding: '16px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--accent-color)',
  },
  statLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  warningsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  warningsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--warning-color)',
  },
  warningsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '12px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '6px',
    border: '1px solid var(--warning-color)',
  },
  warningItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  warningIcon: {
    color: 'var(--warning-color)',
    flexShrink: 0,
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '6px',
    border: '1px solid var(--success-color)',
    fontSize: '14px',
    color: 'var(--success-color)',
  },
  outputPreview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  previewContent: {
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    maxHeight: '200px',
    overflowY: 'auto',
    padding: '12px',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: '12px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    color: 'var(--text-secondary)',
  },
};

export function Summary({ result }: SummaryProps) {
  const [showWarnings, setShowWarnings] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  const { summary, output, outputSuggestedName } = result;
  const hasWarnings = summary.warnings.length > 0;
  const duplicatesRemoved = summary.totalItems - summary.dedupedItems;

  // Truncate preview if too long
  const previewContent =
    output.length > 5000 ? output.substring(0, 5000) + '\n\n... (truncated)' : output;

  return (
    <div style={styles.container}>
      {/* Success message */}
      <div style={styles.successMessage}>
        <span>{'\u2713'}</span>
        <span>
          Extracted <strong>{summary.dedupedItems}</strong> unique reference
          {summary.dedupedItems !== 1 ? 's' : ''}
          {duplicatesRemoved > 0 && (
            <span style={{ color: 'var(--text-muted)' }}>
              {' '}
              ({duplicatesRemoved} duplicate{duplicatesRemoved !== 1 ? 's' : ''} removed)
            </span>
          )}
        </span>
      </div>

      {/* Stats */}
      <div style={styles.statsCard}>
        <div style={styles.stat}>
          <div style={styles.statValue}>{summary.totalInputs}</div>
          <div style={styles.statLabel}>Files Processed</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statValue}>{summary.totalItems}</div>
          <div style={styles.statLabel}>Total Citations</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statValue}>{summary.dedupedItems}</div>
          <div style={styles.statLabel}>Unique References</div>
        </div>
      </div>

      {/* Warnings */}
      {hasWarnings && (
        <div style={styles.warningsContainer}>
          <div
            style={styles.warningsHeader}
            onClick={() => setShowWarnings(!showWarnings)}
          >
            <span>{showWarnings ? '\u25BC' : '\u25B6'}</span>
            <span>{'\u26A0'}</span>
            <span>
              {summary.warnings.length} Warning{summary.warnings.length !== 1 ? 's' : ''}
            </span>
          </div>
          {showWarnings && (
            <div style={styles.warningsList}>
              {summary.warnings.map((warning, index) => (
                <div key={index} style={styles.warningItem}>
                  <span style={styles.warningIcon}>{'\u2022'}</span>
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Output Preview */}
      <div style={styles.outputPreview}>
        <div
          style={styles.previewHeader}
          onClick={() => setShowPreview(!showPreview)}
        >
          <span>{showPreview ? '\u25BC' : '\u25B6'}</span>
          <span>Preview Output</span>
          <span style={{ fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none' }}>
            ({outputSuggestedName})
          </span>
        </div>
        {showPreview && (
          <div style={styles.previewContent}>{previewContent}</div>
        )}
      </div>
    </div>
  );
}
