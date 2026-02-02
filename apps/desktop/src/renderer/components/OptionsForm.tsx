import React from 'react';
import { useAppStore, OutputFormat, LogLevel } from '../lib/state';
import { formatLabels, formatOptions, logLevelLabels, logLevelOptions } from '../lib/formatLabels';

interface OptionsFormProps {
  disabled?: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  radioGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  radioOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontSize: '14px',
  },
  radioOptionSelected: {
    backgroundColor: 'var(--accent-color)',
    borderColor: 'var(--accent-color)',
    color: '#ffffff',
  },
  radioOptionDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  radioInput: {
    display: 'none',
  },
  advancedToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 0',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    border: 'none',
    background: 'none',
    textAlign: 'left',
  },
  advancedContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  labelDescription: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  input: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    outline: 'none',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
};

export function OptionsForm({ disabled = false }: OptionsFormProps) {
  const { options, setOption, advancedOpen, setAdvancedOpen } = useAppStore();

  const handleFormatChange = (format: OutputFormat) => {
    if (!disabled) {
      setOption('format', format);
    }
  };

  return (
    <div style={styles.container}>
      {/* Output Format */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Output Format</div>
        <div style={styles.radioGroup}>
          {formatOptions.map((format) => {
            const isSelected = options.format === format;
            return (
              <label
                key={format}
                style={{
                  ...styles.radioOption,
                  ...(isSelected ? styles.radioOptionSelected : {}),
                  ...(disabled ? styles.radioOptionDisabled : {}),
                }}
              >
                <input
                  type="radio"
                  name="format"
                  value={format}
                  checked={isSelected}
                  onChange={() => handleFormatChange(format)}
                  disabled={disabled}
                  style={styles.radioInput}
                />
                {formatLabels[format].label}
              </label>
            );
          })}
        </div>
      </div>

      {/* Advanced Options Toggle */}
      <button
        style={styles.advancedToggle}
        onClick={() => setAdvancedOpen(!advancedOpen)}
        type="button"
      >
        <span>{advancedOpen ? '\u25BC' : '\u25B6'}</span>
        <span>Advanced Options</span>
      </button>

      {/* Advanced Options Content */}
      {advancedOpen && (
        <div style={styles.advancedContent}>
          {/* GROBID URL */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>GROBID Server URL</label>
            <div style={styles.labelDescription}>
              Required for PDF processing. Leave empty if you only have Word documents.
            </div>
            <input
              type="text"
              style={styles.input}
              placeholder="http://localhost:8070"
              value={options.grobidUrl}
              onChange={(e) => setOption('grobidUrl', e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* Minify */}
          <div style={styles.checkboxRow}>
            <input
              type="checkbox"
              id="minify"
              style={styles.checkbox}
              checked={options.minify}
              onChange={(e) => setOption('minify', e.target.checked)}
              disabled={disabled}
            />
            <label htmlFor="minify" style={styles.checkboxLabel}>
              Minify JSON output
            </label>
          </div>

          {/* Fail on Empty */}
          <div style={styles.checkboxRow}>
            <input
              type="checkbox"
              id="failOnEmpty"
              style={styles.checkbox}
              checked={options.failOnEmpty}
              onChange={(e) => setOption('failOnEmpty', e.target.checked)}
              disabled={disabled}
            />
            <label htmlFor="failOnEmpty" style={styles.checkboxLabel}>
              Fail if no references found
            </label>
          </div>

          {/* Log Level */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Log Level</label>
            <select
              style={styles.select}
              value={options.logLevel}
              onChange={(e) => setOption('logLevel', e.target.value as LogLevel)}
              disabled={disabled}
            >
              {logLevelOptions.map((level) => (
                <option key={level} value={level}>
                  {logLevelLabels[level]}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
