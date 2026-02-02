import { OutputFormat, LogLevel } from './state';

/**
 * Labels for output format options
 */
export const formatLabels: Record<OutputFormat, { label: string; description: string }> = {
  csl: {
    label: 'CSL-JSON',
    description: 'Citation Style Language JSON format (default)',
  },
  biblatex: {
    label: 'BibLaTeX',
    description: 'BibLaTeX format for LaTeX documents',
  },
  bibtex: {
    label: 'BibTeX',
    description: 'Classic BibTeX format',
  },
  ris: {
    label: 'RIS',
    description: 'Research Information Systems format',
  },
};

/**
 * Format options for the dropdown
 */
export const formatOptions: OutputFormat[] = ['csl', 'biblatex', 'bibtex', 'ris'];

/**
 * Labels for log level options
 */
export const logLevelLabels: Record<LogLevel, string> = {
  silent: 'Silent',
  info: 'Info',
  debug: 'Debug',
};

/**
 * Log level options
 */
export const logLevelOptions: LogLevel[] = ['silent', 'info', 'debug'];
