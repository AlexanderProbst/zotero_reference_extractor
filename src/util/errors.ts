/**
 * Base class for zotero-ref-extract errors
 */
export class ExtractorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ExtractorError';
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Error when a file cannot be read or parsed
 */
export class FileReadError extends ExtractorError {
  constructor(filePath: string, reason: string) {
    super(
      `Failed to read file "${filePath}": ${reason}`,
      'FILE_READ_ERROR',
      { filePath, reason }
    );
    this.name = 'FileReadError';
  }
}

/**
 * Error when docx structure is invalid
 */
export class DocxParseError extends ExtractorError {
  constructor(filePath: string, reason: string) {
    super(
      `Invalid DOCX structure in "${filePath}": ${reason}`,
      'DOCX_PARSE_ERROR',
      { filePath, reason }
    );
    this.name = 'DocxParseError';
  }
}

/**
 * Error when JSON parsing fails
 */
export class JsonParseError extends ExtractorError {
  constructor(context: string, reason: string, rawText?: string) {
    super(
      `Failed to parse JSON in ${context}: ${reason}`,
      'JSON_PARSE_ERROR',
      { context, reason, rawText: rawText?.substring(0, 200) }
    );
    this.name = 'JsonParseError';
  }
}

/**
 * Error when GROBID service is unavailable
 */
export class GrobidUnavailableError extends ExtractorError {
  constructor(url: string, reason: string) {
    super(
      `GROBID service unavailable at "${url}": ${reason}\n\n` +
      `To start GROBID locally, run:\n` +
      `  docker run -t --rm -p 8070:8070 lfoppiano/grobid:0.8.0\n\n` +
      `Then retry with: --pdf-via-grobid http://localhost:8070`,
      'GROBID_UNAVAILABLE',
      { url, reason }
    );
    this.name = 'GrobidUnavailableError';
  }
}

/**
 * Error when GROBID processing fails
 */
export class GrobidProcessingError extends ExtractorError {
  constructor(filePath: string, reason: string) {
    super(
      `GROBID failed to process "${filePath}": ${reason}`,
      'GROBID_PROCESSING_ERROR',
      { filePath, reason }
    );
    this.name = 'GrobidProcessingError';
  }
}

/**
 * Error for unsupported file types
 */
export class UnsupportedFileError extends ExtractorError {
  constructor(filePath: string, extension: string) {
    super(
      `Unsupported file type "${extension}" for "${filePath}"`,
      'UNSUPPORTED_FILE',
      { filePath, extension }
    );
    this.name = 'UnsupportedFileError';
  }
}

/**
 * Warning messages for common issues (not errors, just diagnostic info)
 */
export const DiagnosticMessages = {
  NO_ZOTERO_FIELDS: (filePath: string) =>
    `No Zotero/Mendeley citation fields found in "${filePath}".\n` +
    `Possible reasons:\n` +
    `  - Citations were inserted as plain text (not linked)\n` +
    `  - Document uses Word's built-in bibliography (not Zotero)\n` +
    `  - Citations were converted to static text\n\n` +
    `Solutions:\n` +
    `  - For plain text citations: try AnyStyle (https://anystyle.io) or Zotero's RTF Scan\n` +
    `  - For Word built-in citations: export using Word's BibTeX style`,

  WORD_BOOKMARKS_DETECTED: (filePath: string) =>
    `Word bookmark-style citations detected in "${filePath}".\n` +
    `This document uses Word's built-in citation feature, not Zotero.\n\n` +
    `To extract references:\n` +
    `  1. Open the document in Word\n` +
    `  2. Go to References > Manage Sources\n` +
    `  3. Export the bibliography`,

  OLD_ZOTERO_FORMAT: (filePath: string) =>
    `Older Zotero format detected in "${filePath}".\n` +
    `This document may use a legacy citation format.\n` +
    `Try updating citations in Zotero and resaving the document.`,

  GROBID_EMPTY_RESULT: (filePath: string) =>
    `GROBID returned no references for "${filePath}".\n` +
    `The PDF may not contain a parseable bibliography section.\n` +
    `Try:\n` +
    `  - Ensuring the PDF has a clear "References" section\n` +
    `  - Using a higher-quality PDF scan\n` +
    `  - Manual extraction with AnyStyle`,
} as const;
