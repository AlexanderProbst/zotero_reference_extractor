/**
 * zotero-ref-extract
 *
 * Extract bibliographic references from Word documents and PDFs
 */

// Core types
export {
  OutputFormat,
  LogLevel,
  CslItem,
  CslName,
  CslDate,
  CslItemSchema,
  CslNameSchema,
  CslDateSchema,
  ZoteroCitation,
  ZoteroCitationItem,
  ZoteroCitationSchema,
  ZoteroCitationItemSchema,
  ExtractedRef,
  ExtractionResult,
  CliOptions,
  GrobidConfig,
} from './core/types.js';

// Normalization utilities
export {
  normalizeRefs,
  deduplicateItems,
  sortItems,
  trimItem,
  generateDedupeKey,
  generateCiteKey,
} from './core/normalize.js';

// Extractors
export { extractFromDocx, DocxExtractionResult } from './extractors/docx.js';
export {
  extractFromPdf,
  extractFromPdfFullText,
  checkGrobidHealth,
  PdfExtractionResult,
} from './extractors/pdf.js';

// Format conversion
export { convertToFormat } from './convert/citationJs.js';

// File I/O utilities
export {
  readFileBuffer,
  readFileText,
  writeFileText,
  readZipEntries,
  readZipEntry,
  expandInputPaths,
  getExtension,
  getBasename,
  pathExists,
  isDirectory,
} from './io/fs.js';

// Logging
export { log } from './util/log.js';

// Errors
export {
  ExtractorError,
  FileReadError,
  DocxParseError,
  JsonParseError,
  GrobidUnavailableError,
  GrobidProcessingError,
  UnsupportedFileError,
  DiagnosticMessages,
} from './util/errors.js';
