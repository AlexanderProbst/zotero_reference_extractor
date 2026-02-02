import { request } from 'undici';
import { createReadStream, statSync } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';
import { CslItem, ExtractedRef, GrobidConfig } from '../core/types.js';
import { GrobidUnavailableError, GrobidProcessingError, DiagnosticMessages } from '../util/errors.js';
import { log } from '../util/log.js';

/**
 * Default GROBID configuration
 */
const DEFAULT_GROBID_CONFIG: GrobidConfig = {
  baseUrl: 'http://localhost:8070',
  timeout: 60000, // 60 seconds
  acceptFormat: 'tei',
};

/**
 * Result from PDF extraction
 */
export interface PdfExtractionResult {
  refs: ExtractedRef[];
  warnings: string[];
  grobidAvailable: boolean;
}

/**
 * Check if GROBID service is available
 */
export async function checkGrobidHealth(baseUrl: string): Promise<boolean> {
  try {
    const response = await request(`${baseUrl}/api/isalive`, {
      method: 'GET',
      headersTimeout: 5000,
      bodyTimeout: 5000,
    });

    return response.statusCode === 200;
  } catch {
    return false;
  }
}

/**
 * Extract references from a PDF via GROBID
 */
export async function extractFromPdf(
  filePath: string,
  config: Partial<GrobidConfig> = {}
): Promise<PdfExtractionResult> {
  const fullConfig = { ...DEFAULT_GROBID_CONFIG, ...config };

  log.debug(`Extracting from PDF via GROBID: ${filePath}`);
  log.debug(`GROBID URL: ${fullConfig.baseUrl}`);

  // Check GROBID availability
  const isAlive = await checkGrobidHealth(fullConfig.baseUrl);

  if (!isAlive) {
    throw new GrobidUnavailableError(fullConfig.baseUrl, 'Service not responding');
  }

  // Get file stats for logging
  const stats = statSync(filePath);
  log.debug(`PDF file size: ${(stats.size / 1024).toFixed(1)} KB`);

  try {
    // Read file and create form data
    const fileBuffer = await readFileAsBuffer(filePath);

    // Call GROBID processReferences endpoint
    const response = await request(`${fullConfig.baseUrl}/api/processReferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/xml',
      },
      body: `input=${encodeURIComponent(fileBuffer.toString('base64'))}&consolidateCitations=1`,
      headersTimeout: fullConfig.timeout,
      bodyTimeout: fullConfig.timeout,
    });

    if (response.statusCode !== 200) {
      const body = await response.body.text();
      throw new GrobidProcessingError(filePath, `HTTP ${response.statusCode}: ${body.substring(0, 200)}`);
    }

    const teiXml = await response.body.text();

    if (!teiXml || teiXml.trim().length === 0) {
      return {
        refs: [],
        warnings: [DiagnosticMessages.GROBID_EMPTY_RESULT(filePath)],
        grobidAvailable: true,
      };
    }

    // Parse TEI XML to CSL items
    const refs = parseTeiToCsl(teiXml, filePath);

    if (refs.length === 0) {
      return {
        refs: [],
        warnings: [DiagnosticMessages.GROBID_EMPTY_RESULT(filePath)],
        grobidAvailable: true,
      };
    }

    log.debug(`Extracted ${refs.length} references from PDF`);

    return {
      refs,
      warnings: [],
      grobidAvailable: true,
    };
  } catch (error) {
    if (error instanceof GrobidUnavailableError || error instanceof GrobidProcessingError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new GrobidProcessingError(filePath, message);
  }
}

/**
 * Alternative: Extract references using the full PDF processing endpoint
 */
export async function extractFromPdfFullText(
  filePath: string,
  config: Partial<GrobidConfig> = {}
): Promise<PdfExtractionResult> {
  const fullConfig = { ...DEFAULT_GROBID_CONFIG, ...config };

  log.debug(`Full-text PDF extraction via GROBID: ${filePath}`);

  const isAlive = await checkGrobidHealth(fullConfig.baseUrl);
  if (!isAlive) {
    throw new GrobidUnavailableError(fullConfig.baseUrl, 'Service not responding');
  }

  try {
    const fileBuffer = await readFileAsBuffer(filePath);

    // Use processFulltextDocument for complete extraction
    const response = await request(`${fullConfig.baseUrl}/api/processFulltextDocument`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/xml',
      },
      body: `input=${encodeURIComponent(fileBuffer.toString('base64'))}&consolidateCitations=1&includeRawCitations=1`,
      headersTimeout: fullConfig.timeout,
      bodyTimeout: fullConfig.timeout,
    });

    if (response.statusCode !== 200) {
      const body = await response.body.text();
      throw new GrobidProcessingError(filePath, `HTTP ${response.statusCode}: ${body.substring(0, 200)}`);
    }

    const teiXml = await response.body.text();
    const refs = parseTeiToCsl(teiXml, filePath);

    return {
      refs,
      warnings: refs.length === 0 ? [DiagnosticMessages.GROBID_EMPTY_RESULT(filePath)] : [],
      grobidAvailable: true,
    };
  } catch (error) {
    if (error instanceof GrobidUnavailableError || error instanceof GrobidProcessingError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new GrobidProcessingError(filePath, message);
  }
}

/**
 * Read file as buffer
 */
async function readFileAsBuffer(filePath: string): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const stream = createReadStream(filePath);

  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks);
}

/**
 * Parse TEI XML from GROBID and convert to CSL items
 */
function parseTeiToCsl(teiXml: string, sourceFile: string): ExtractedRef[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    preserveOrder: false,
  });

  let doc: unknown;
  try {
    doc = parser.parse(teiXml);
  } catch (error) {
    log.debug(`TEI parse error: ${error}`);
    return [];
  }

  const refs: ExtractedRef[] = [];

  // Find biblStruct elements (bibliography entries)
  const biblStructs = findElements(doc, 'biblStruct');

  for (const bibl of biblStructs) {
    const item = biblStructToCsl(bibl);
    if (item) {
      refs.push({
        item,
        source: 'pdf-grobid',
        sourceFile,
        rawData: bibl,
      });
    }
  }

  return refs;
}

/**
 * Recursively find elements by name
 */
function findElements(node: unknown, name: string, results: unknown[] = []): unknown[] {
  if (node === null || node === undefined) {
    return results;
  }

  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;

    if (name in obj) {
      const value = obj[name];
      if (Array.isArray(value)) {
        results.push(...value);
      } else {
        results.push(value);
      }
    }

    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          findElements(item, name, results);
        }
      } else if (typeof value === 'object') {
        findElements(value, name, results);
      }
    }
  }

  return results;
}

/**
 * Convert a TEI biblStruct to CSL-JSON
 */
function biblStructToCsl(bibl: unknown): CslItem | null {
  if (typeof bibl !== 'object' || bibl === null) {
    return null;
  }

  const obj = bibl as Record<string, unknown>;
  const item: Partial<CslItem> = {
    type: 'article-journal', // Default type
  };

  // Extract analytic (article-level metadata)
  const analytic = obj.analytic as Record<string, unknown> | undefined;
  if (analytic) {
    // Title
    const title = extractText(analytic.title);
    if (title) item.title = title;

    // Authors
    const authors = extractAuthors(analytic.author);
    if (authors.length > 0) item.author = authors;

    // DOI/identifiers from analytic
    extractIdentifiers(analytic, item);
  }

  // Extract monogr (journal/book-level metadata)
  const monogr = obj.monogr as Record<string, unknown> | undefined;
  if (monogr) {
    // Container title (journal name)
    const containerTitle = extractText(monogr.title);
    if (containerTitle) item['container-title'] = containerTitle;

    // If no title from analytic, use monogr title
    if (!item.title) {
      item.title = containerTitle;
      item.type = 'book';
    }

    // Volume, Issue
    const imprint = monogr.imprint as Record<string, unknown> | undefined;
    if (imprint) {
      const volume = extractText(imprint.biblScope, 'volume');
      if (volume) item.volume = volume;

      const issue = extractText(imprint.biblScope, 'issue');
      if (issue) item.issue = issue;

      const pages = extractText(imprint.biblScope, 'page');
      if (pages) item.page = pages;

      // Date
      const date = imprint.date as Record<string, unknown> | string | undefined;
      if (date) {
        const year = typeof date === 'string' ? date : (date['@_when'] as string) || (date['#text'] as string);
        if (year) {
          const yearNum = parseInt(year.substring(0, 4), 10);
          if (!isNaN(yearNum)) {
            item.issued = { 'date-parts': [[yearNum]] };
          }
        }
      }

      // Publisher
      const publisher = extractText(imprint.publisher);
      if (publisher) item.publisher = publisher;
    }

    // Authors from monogr (for books)
    if (!item.author) {
      const authors = extractAuthors(monogr.author);
      if (authors.length > 0) item.author = authors;
    }

    // DOI/identifiers from monogr
    extractIdentifiers(monogr, item);
  }

  // Extract identifiers from biblStruct level
  extractIdentifiers(obj, item);

  // Require at least a title
  if (!item.title) {
    return null;
  }

  return item as CslItem;
}

/**
 * Extract text content from an element
 */
function extractText(element: unknown, type?: string): string | undefined {
  if (!element) return undefined;

  if (typeof element === 'string') {
    return element.trim();
  }

  if (Array.isArray(element)) {
    for (const el of element) {
      if (type) {
        const obj = el as Record<string, unknown>;
        if (obj['@_unit'] === type || obj['@_type'] === type) {
          const text = extractText(el);
          if (text) return text;
        }
      } else {
        const text = extractText(el);
        if (text) return text;
      }
    }
    return undefined;
  }

  if (typeof element === 'object') {
    const obj = element as Record<string, unknown>;

    if (type && obj['@_unit'] !== type && obj['@_type'] !== type) {
      return undefined;
    }

    if ('#text' in obj) {
      return String(obj['#text']).trim();
    }

    // Try to find nested text
    for (const key of Object.keys(obj)) {
      if (!key.startsWith('@_')) {
        const text = extractText(obj[key]);
        if (text) return text;
      }
    }
  }

  return undefined;
}

/**
 * Extract authors from TEI author elements
 */
function extractAuthors(authorElement: unknown): Array<{ family?: string; given?: string; literal?: string }> {
  const authors: Array<{ family?: string; given?: string; literal?: string }> = [];

  if (!authorElement) return authors;

  const authorList = Array.isArray(authorElement) ? authorElement : [authorElement];

  for (const author of authorList) {
    if (typeof author !== 'object' || author === null) continue;

    const obj = author as Record<string, unknown>;
    const persName = obj.persName as Record<string, unknown> | undefined;

    if (persName) {
      const forename = extractText(persName.forename);
      const surname = extractText(persName.surname);

      if (surname || forename) {
        authors.push({
          family: surname,
          given: forename,
        });
      }
    } else {
      // Try to extract name directly
      const name = extractText(author);
      if (name) {
        authors.push({ literal: name });
      }
    }
  }

  return authors;
}

/**
 * Extract identifiers (DOI, PMID, etc.)
 */
function extractIdentifiers(obj: Record<string, unknown>, item: Partial<CslItem>): void {
  const idno = obj.idno;

  if (!idno) return;

  const idList = Array.isArray(idno) ? idno : [idno];

  for (const id of idList) {
    if (typeof id !== 'object' || id === null) continue;

    const idObj = id as Record<string, unknown>;
    const type = idObj['@_type'] as string | undefined;
    const value = extractText(id);

    if (!type || !value) continue;

    switch (type.toUpperCase()) {
      case 'DOI':
        item.DOI = value;
        break;
      case 'PMID':
        item.PMID = value;
        break;
      case 'PMCID':
        item.PMCID = value;
        break;
      case 'ISSN':
        item.ISSN = value;
        break;
      case 'ISBN':
        item.ISBN = value;
        break;
    }
  }
}
