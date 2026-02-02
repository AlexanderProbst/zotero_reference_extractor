import { z } from 'zod';

/**
 * Output format options
 */
export enum OutputFormat {
  CSL = 'csl',
  BibLaTeX = 'biblatex',
  BibTeX = 'bibtex',
  RIS = 'ris',
}

/**
 * Log level options
 */
export enum LogLevel {
  Silent = 'silent',
  Info = 'info',
  Debug = 'debug',
}

/**
 * CSL-JSON Name schema
 */
export const CslNameSchema = z.object({
  family: z.string().optional(),
  given: z.string().optional(),
  literal: z.string().optional(),
  'dropping-particle': z.string().optional(),
  'non-dropping-particle': z.string().optional(),
  suffix: z.string().optional(),
});

export type CslName = z.infer<typeof CslNameSchema>;

/**
 * CSL-JSON Date schema
 */
export const CslDateSchema = z.object({
  'date-parts': z.array(z.array(z.union([z.number(), z.string()]))).optional(),
  season: z.union([z.number(), z.string()]).optional(),
  circa: z.union([z.boolean(), z.number(), z.string()]).optional(),
  literal: z.string().optional(),
  raw: z.string().optional(),
});

export type CslDate = z.infer<typeof CslDateSchema>;

/**
 * CSL-JSON Item schema (comprehensive but flexible)
 */
export const CslItemSchema = z.object({
  // Required
  type: z.string(),

  // Identifiers
  id: z.union([z.string(), z.number()]).optional(),
  DOI: z.string().optional(),
  ISBN: z.string().optional(),
  ISSN: z.string().optional(),
  PMID: z.string().optional(),
  PMCID: z.string().optional(),
  URL: z.string().optional(),

  // Titles
  title: z.string().optional(),
  'title-short': z.string().optional(),
  'container-title': z.string().optional(),
  'container-title-short': z.string().optional(),
  'collection-title': z.string().optional(),

  // Creators
  author: z.array(CslNameSchema).optional(),
  editor: z.array(CslNameSchema).optional(),
  translator: z.array(CslNameSchema).optional(),
  'collection-editor': z.array(CslNameSchema).optional(),
  'container-author': z.array(CslNameSchema).optional(),

  // Dates
  issued: CslDateSchema.optional(),
  accessed: CslDateSchema.optional(),
  'event-date': CslDateSchema.optional(),
  submitted: CslDateSchema.optional(),

  // Numbers
  volume: z.union([z.string(), z.number()]).optional(),
  issue: z.union([z.string(), z.number()]).optional(),
  page: z.string().optional(),
  'page-first': z.string().optional(),
  'number-of-pages': z.union([z.string(), z.number()]).optional(),
  edition: z.union([z.string(), z.number()]).optional(),

  // Publisher info
  publisher: z.string().optional(),
  'publisher-place': z.string().optional(),

  // Other
  abstract: z.string().optional(),
  language: z.string().optional(),
  note: z.string().optional(),
  keyword: z.string().optional(),
  'citation-key': z.string().optional(),
  'citation-label': z.string().optional(),
}).passthrough(); // Allow additional CSL fields

export type CslItem = z.infer<typeof CslItemSchema>;

/**
 * Zotero citation structure (from ADDIN fields)
 */
export const ZoteroCitationItemSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  uris: z.array(z.string()).optional(),
  itemData: CslItemSchema.optional(),
  locator: z.string().optional(),
  label: z.string().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  'suppress-author': z.boolean().optional(),
});

export type ZoteroCitationItem = z.infer<typeof ZoteroCitationItemSchema>;

export const ZoteroCitationSchema = z.object({
  citationID: z.string().optional(),
  citationItems: z.array(ZoteroCitationItemSchema).optional(),
  properties: z.record(z.unknown()).optional(),
  schema: z.string().optional(),
});

export type ZoteroCitation = z.infer<typeof ZoteroCitationSchema>;

/**
 * Extracted reference with metadata about its source
 */
export interface ExtractedRef {
  item: CslItem;
  source: 'docx-citation' | 'docx-bibliography' | 'pdf-grobid';
  sourceFile: string;
  rawData?: unknown;
}

/**
 * Extraction result containing items and diagnostics
 */
export interface ExtractionResult {
  items: CslItem[];
  warnings: string[];
  errors: string[];
  stats: {
    totalCitations: number;
    uniqueItems: number;
    duplicatesRemoved: number;
  };
}

/**
 * CLI options
 */
export interface CliOptions {
  input: string[];
  format: OutputFormat;
  pdfViaGrobid?: string;
  out?: string;
  minify: boolean;
  failOnEmpty: boolean;
  logLevel: LogLevel;
}

/**
 * GROBID configuration
 */
export interface GrobidConfig {
  baseUrl: string;
  timeout: number;
  acceptFormat: 'tei' | 'bibtex';
}
