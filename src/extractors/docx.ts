import { XMLParser } from 'fast-xml-parser';
import { readZipEntries } from '../io/fs.js';
import {
  CslItem,
  CslItemSchema,
  ZoteroCitationSchema,
  ExtractedRef,
} from '../core/types.js';
import { DocxParseError, JsonParseError, DiagnosticMessages } from '../util/errors.js';
import { log } from '../util/log.js';

/**
 * Patterns for detecting citation types
 */
const WORD_BOOKMARK_PATTERN = /<w:bookmarkStart[^>]*w:name="_Ref/;
const WORD_BIBLIOGRAPHY_PATTERN = /<b:Sources/;

/**
 * Result from DOCX extraction
 */
export interface DocxExtractionResult {
  refs: ExtractedRef[];
  warnings: string[];
  hasCitations: boolean;
  hasWordBookmarks: boolean;
  hasWordBibliography: boolean;
}

/**
 * Extract references from a Word document
 */
export async function extractFromDocx(filePath: string): Promise<DocxExtractionResult> {
  log.debug(`Extracting from DOCX: ${filePath}`);

  // Read all XML files from the docx
  const xmlEntries = await readZipEntries(filePath, (path) => {
    return (
      path === 'word/document.xml' ||
      path.startsWith('word/header') ||
      path.startsWith('word/footer') ||
      path === 'customXml/item1.xml' // Word bibliography storage
    );
  });

  if (xmlEntries.length === 0) {
    throw new DocxParseError(filePath, 'No document.xml found in archive');
  }

  const warnings: string[] = [];
  const allRefs: ExtractedRef[] = [];
  let hasCitations = false;
  let hasWordBookmarks = false;
  let hasWordBibliography = false;

  // Process each XML file
  for (const entry of xmlEntries) {
    const xmlContent = entry.content.toString('utf-8');

    // Check for Word bookmarks
    if (WORD_BOOKMARK_PATTERN.test(xmlContent)) {
      hasWordBookmarks = true;
    }

    // Check for Word bibliography
    if (WORD_BIBLIOGRAPHY_PATTERN.test(xmlContent)) {
      hasWordBibliography = true;
    }

    // Extract Zotero/Mendeley citations
    const citations = extractCitationsFromXml(xmlContent, filePath);
    if (citations.length > 0) {
      hasCitations = true;
      allRefs.push(...citations);
    }
  }

  // Generate appropriate warnings
  if (!hasCitations) {
    if (hasWordBookmarks) {
      warnings.push(DiagnosticMessages.WORD_BOOKMARKS_DETECTED(filePath));
    } else if (hasWordBibliography) {
      warnings.push(DiagnosticMessages.WORD_BOOKMARKS_DETECTED(filePath));
    } else {
      warnings.push(DiagnosticMessages.NO_ZOTERO_FIELDS(filePath));
    }
  }

  log.debug(`Found ${allRefs.length} references in ${filePath}`);

  return {
    refs: allRefs,
    warnings,
    hasCitations,
    hasWordBookmarks,
    hasWordBibliography,
  };
}

/**
 * Extract citations from XML content
 */
function extractCitationsFromXml(xmlContent: string, sourceFile: string): ExtractedRef[] {
  const refs: ExtractedRef[] = [];

  // Parse XML
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    preserveOrder: false,
    trimValues: false,
  });

  let doc: unknown;
  try {
    doc = parser.parse(xmlContent);
  } catch (error) {
    log.debug(`XML parse error: ${error}`);
    return refs;
  }

  // Collect all instruction text nodes
  const instrTexts = collectInstrTexts(doc);

  // Join contiguous instruction runs and extract JSON
  const combinedText = instrTexts.join('');

  // Find Zotero/Mendeley citation JSON blocks
  const jsonBlocks = extractJsonBlocks(combinedText);

  for (const json of jsonBlocks) {
    try {
      const items = parseCitationJson(json, sourceFile);
      refs.push(...items);
    } catch (error) {
      log.debug(`Failed to parse citation JSON: ${error}`);
    }
  }

  return refs;
}

/**
 * Recursively collect all w:instrText content
 */
function collectInstrTexts(node: unknown, texts: string[] = []): string[] {
  if (node === null || node === undefined) {
    return texts;
  }

  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;

    // Check for instrText content
    if ('w:instrText' in obj) {
      const instrText = obj['w:instrText'];
      if (typeof instrText === 'string') {
        texts.push(instrText);
      } else if (typeof instrText === 'object' && instrText !== null) {
        const textObj = instrText as Record<string, unknown>;
        if ('#text' in textObj && typeof textObj['#text'] === 'string') {
          texts.push(textObj['#text']);
        }
      }
    }

    // Recurse into all properties
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          collectInstrTexts(item, texts);
        }
      } else if (typeof value === 'object') {
        collectInstrTexts(value, texts);
      }
    }
  }

  return texts;
}

/**
 * Extract balanced JSON blocks from instruction text
 */
function extractJsonBlocks(text: string): string[] {
  const blocks: string[] = [];

  // Find citation markers
  const citationPattern = /ADDIN (?:ZOTERO_ITEM |ZOTERO_BIBL |CSL_CITATION )/g;
  let match: RegExpExecArray | null;

  while ((match = citationPattern.exec(text)) !== null) {
    const startSearch = match.index + match[0].length;
    const jsonStart = text.indexOf('{', startSearch);

    if (jsonStart === -1) continue;

    // Find balanced closing brace
    const jsonEnd = findBalancedBrace(text, jsonStart);

    if (jsonEnd !== -1) {
      const jsonStr = text.slice(jsonStart, jsonEnd + 1);
      blocks.push(jsonStr);
    }
  }

  return blocks;
}

/**
 * Find the position of the balanced closing brace
 */
function findBalancedBrace(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

/**
 * Parse citation JSON and extract CSL items
 */
function parseCitationJson(jsonStr: string, sourceFile: string): ExtractedRef[] {
  const refs: ExtractedRef[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (error) {
    throw new JsonParseError('citation field', String(error), jsonStr);
  }

  // Validate as Zotero citation
  const result = ZoteroCitationSchema.safeParse(parsed);

  if (!result.success) {
    log.debug(`Citation validation failed: ${result.error.message}`);
    // Try to extract items anyway if it looks like a citation object
    if (typeof parsed === 'object' && parsed !== null && 'citationItems' in parsed) {
      const obj = parsed as { citationItems?: unknown[] };
      if (Array.isArray(obj.citationItems)) {
        for (const item of obj.citationItems) {
          const extracted = extractItemData(item, sourceFile);
          if (extracted) refs.push(extracted);
        }
      }
    }
    return refs;
  }

  const citation = result.data;

  // Extract items from citationItems
  if (citation.citationItems) {
    for (const citationItem of citation.citationItems) {
      if (citationItem.itemData) {
        const itemResult = CslItemSchema.safeParse(citationItem.itemData);
        if (itemResult.success) {
          refs.push({
            item: itemResult.data,
            source: 'docx-citation',
            sourceFile,
            rawData: citationItem,
          });
        } else {
          log.debug(`Item validation failed: ${itemResult.error.message}`);
          // Still add it if it has basic required fields
          if (citationItem.itemData.type) {
            refs.push({
              item: citationItem.itemData as CslItem,
              source: 'docx-citation',
              sourceFile,
              rawData: citationItem,
            });
          }
        }
      }
    }
  }

  return refs;
}

/**
 * Extract itemData from a citation item
 */
function extractItemData(item: unknown, sourceFile: string): ExtractedRef | null {
  if (typeof item !== 'object' || item === null) return null;

  const obj = item as Record<string, unknown>;
  if (!obj.itemData || typeof obj.itemData !== 'object') return null;

  const itemData = obj.itemData as Record<string, unknown>;
  if (!itemData.type) return null;

  return {
    item: itemData as CslItem,
    source: 'docx-citation',
    sourceFile,
    rawData: item,
  };
}
