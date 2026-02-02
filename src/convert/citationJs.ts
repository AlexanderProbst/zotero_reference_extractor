import Cite from 'citation-js';
import { CslItem, OutputFormat } from '../core/types.js';
import { generateCiteKey } from '../core/normalize.js';
import { log } from '../util/log.js';

// Register plugins (citation-js auto-loads common formats)
// @ts-expect-error - citation-js types are incomplete
const { plugins } = Cite;

/**
 * Convert CSL-JSON items to the specified output format
 */
export function convertToFormat(
  items: CslItem[],
  format: OutputFormat,
  options: { minify?: boolean } = {}
): string {
  log.debug(`Converting ${items.length} items to ${format}`);

  // Ensure all items have IDs (required for some formats)
  const itemsWithIds = items.map((item, index) => ({
    ...item,
    id: item.id ?? generateCiteKey(item) ?? `ref-${index + 1}`,
  }));

  switch (format) {
    case OutputFormat.CSL:
      return formatCslJson(itemsWithIds, options.minify);

    case OutputFormat.BibLaTeX:
      return formatBibLaTeX(itemsWithIds);

    case OutputFormat.BibTeX:
      return formatBibTeX(itemsWithIds);

    case OutputFormat.RIS:
      return formatRis(itemsWithIds);

    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * Format as CSL-JSON
 */
function formatCslJson(items: CslItem[], minify = false): string {
  if (minify) {
    return JSON.stringify(items);
  }
  return JSON.stringify(items, null, 2);
}

/**
 * Format as BibLaTeX using citation-js
 */
function formatBibLaTeX(items: CslItem[]): string {
  try {
    const cite = new Cite(items);

    // Use BibLaTeX format
    const output = cite.format('bibtex', {
      format: 'text',
      template: 'biblatex',
    });

    // Post-process to use our generated citekeys
    return postProcessBibTeX(output, items);
  } catch (error) {
    log.debug(`citation-js BibLaTeX error: ${error}`);
    // Fallback to manual generation
    return manualBibLaTeX(items);
  }
}

/**
 * Format as BibTeX using citation-js
 */
function formatBibTeX(items: CslItem[]): string {
  try {
    const cite = new Cite(items);

    const output = cite.format('bibtex', {
      format: 'text',
    });

    return postProcessBibTeX(output, items);
  } catch (error) {
    log.debug(`citation-js BibTeX error: ${error}`);
    return manualBibTeX(items);
  }
}

/**
 * Post-process BibTeX to use our citekeys
 */
function postProcessBibTeX(bibtex: string, items: CslItem[]): string {
  let result = bibtex;

  // Build a map of original IDs to our citekeys
  for (const item of items) {
    const originalId = String(item.id);
    const newKey = generateCiteKey(item);

    // Replace citation key in @type{key,
    const pattern = new RegExp(`(@\\w+\\{)${escapeRegex(originalId)}(,)`, 'g');
    result = result.replace(pattern, `$1${newKey}$2`);
  }

  return result;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format as RIS using citation-js
 */
function formatRis(items: CslItem[]): string {
  try {
    const cite = new Cite(items);

    return cite.format('ris', {
      format: 'text',
    });
  } catch (error) {
    log.debug(`citation-js RIS error: ${error}`);
    return manualRis(items);
  }
}

/**
 * Manual BibLaTeX generation fallback
 */
function manualBibLaTeX(items: CslItem[]): string {
  return items.map((item) => generateBibLaTeXEntry(item)).join('\n\n');
}

/**
 * Manual BibTeX generation fallback
 */
function manualBibTeX(items: CslItem[]): string {
  return items.map((item) => generateBibTeXEntry(item)).join('\n\n');
}

/**
 * Generate a single BibLaTeX entry
 */
function generateBibLaTeXEntry(item: CslItem): string {
  const key = generateCiteKey(item);
  const type = mapCslTypeToBibLaTeX(item.type);
  const fields: string[] = [];

  // Authors
  if (item.author && item.author.length > 0) {
    const authors = item.author
      .map((a) => {
        if (a.literal) return a.literal;
        if (a.family && a.given) return `${a.family}, ${a.given}`;
        if (a.family) return a.family;
        return '';
      })
      .filter(Boolean)
      .join(' and ');
    if (authors) fields.push(`  author = {${authors}}`);
  }

  // Title
  if (item.title) {
    fields.push(`  title = {${item.title}}`);
  }

  // Year
  if (item.issued?.['date-parts']?.[0]?.[0]) {
    fields.push(`  year = {${item.issued['date-parts'][0][0]}}`);
  }

  // Journal/Container
  if (item['container-title']) {
    const fieldName = type === 'article' ? 'journaltitle' : 'booktitle';
    fields.push(`  ${fieldName} = {${item['container-title']}}`);
  }

  // Volume, Issue, Pages
  if (item.volume) fields.push(`  volume = {${item.volume}}`);
  if (item.issue) fields.push(`  number = {${item.issue}}`);
  if (item.page) fields.push(`  pages = {${item.page}}`);

  // DOI
  if (item.DOI) fields.push(`  doi = {${item.DOI}}`);

  // URL
  if (item.URL) fields.push(`  url = {${item.URL}}`);

  // Publisher
  if (item.publisher) fields.push(`  publisher = {${item.publisher}}`);

  // ISBN
  if (item.ISBN) fields.push(`  isbn = {${item.ISBN}}`);

  return `@${type}{${key},\n${fields.join(',\n')}\n}`;
}

/**
 * Generate a single BibTeX entry
 */
function generateBibTeXEntry(item: CslItem): string {
  const key = generateCiteKey(item);
  const type = mapCslTypeToBibTeX(item.type);
  const fields: string[] = [];

  // Authors
  if (item.author && item.author.length > 0) {
    const authors = item.author
      .map((a) => {
        if (a.literal) return a.literal;
        if (a.family && a.given) return `${a.family}, ${a.given}`;
        if (a.family) return a.family;
        return '';
      })
      .filter(Boolean)
      .join(' and ');
    if (authors) fields.push(`  author = {${authors}}`);
  }

  // Title
  if (item.title) {
    fields.push(`  title = {${item.title}}`);
  }

  // Year
  if (item.issued?.['date-parts']?.[0]?.[0]) {
    fields.push(`  year = {${item.issued['date-parts'][0][0]}}`);
  }

  // Journal
  if (item['container-title']) {
    fields.push(`  journal = {${item['container-title']}}`);
  }

  // Volume, Number, Pages
  if (item.volume) fields.push(`  volume = {${item.volume}}`);
  if (item.issue) fields.push(`  number = {${item.issue}}`);
  if (item.page) fields.push(`  pages = {${item.page}}`);

  // DOI
  if (item.DOI) fields.push(`  doi = {${item.DOI}}`);

  // URL
  if (item.URL) fields.push(`  url = {${item.URL}}`);

  // Publisher
  if (item.publisher) fields.push(`  publisher = {${item.publisher}}`);

  return `@${type}{${key},\n${fields.join(',\n')}\n}`;
}

/**
 * Map CSL type to BibLaTeX type
 */
function mapCslTypeToBibLaTeX(cslType: string): string {
  const mapping: Record<string, string> = {
    'article-journal': 'article',
    'article-magazine': 'article',
    'article-newspaper': 'article',
    book: 'book',
    chapter: 'incollection',
    'paper-conference': 'inproceedings',
    thesis: 'thesis',
    report: 'report',
    webpage: 'online',
    dataset: 'dataset',
    software: 'software',
  };

  return mapping[cslType] || 'misc';
}

/**
 * Map CSL type to BibTeX type
 */
function mapCslTypeToBibTeX(cslType: string): string {
  const mapping: Record<string, string> = {
    'article-journal': 'article',
    'article-magazine': 'article',
    'article-newspaper': 'article',
    book: 'book',
    chapter: 'incollection',
    'paper-conference': 'inproceedings',
    thesis: 'phdthesis',
    report: 'techreport',
  };

  return mapping[cslType] || 'misc';
}

/**
 * Manual RIS generation fallback
 */
function manualRis(items: CslItem[]): string {
  return items.map((item) => generateRisEntry(item)).join('\n');
}

/**
 * Generate a single RIS entry
 */
function generateRisEntry(item: CslItem): string {
  const lines: string[] = [];

  // Type
  lines.push(`TY  - ${mapCslTypeToRis(item.type)}`);

  // Authors
  if (item.author) {
    for (const author of item.author) {
      if (author.literal) {
        lines.push(`AU  - ${author.literal}`);
      } else if (author.family) {
        const name = author.given
          ? `${author.family}, ${author.given}`
          : author.family;
        lines.push(`AU  - ${name}`);
      }
    }
  }

  // Title
  if (item.title) lines.push(`TI  - ${item.title}`);

  // Year
  if (item.issued?.['date-parts']?.[0]?.[0]) {
    lines.push(`PY  - ${item.issued['date-parts'][0][0]}`);
  }

  // Journal
  if (item['container-title']) lines.push(`JO  - ${item['container-title']}`);

  // Volume, Issue, Pages
  if (item.volume) lines.push(`VL  - ${item.volume}`);
  if (item.issue) lines.push(`IS  - ${item.issue}`);
  if (item.page) {
    const [sp, ep] = item.page.split('-');
    if (sp) lines.push(`SP  - ${sp.trim()}`);
    if (ep) lines.push(`EP  - ${ep.trim()}`);
  }

  // DOI
  if (item.DOI) lines.push(`DO  - ${item.DOI}`);

  // URL
  if (item.URL) lines.push(`UR  - ${item.URL}`);

  // Publisher
  if (item.publisher) lines.push(`PB  - ${item.publisher}`);

  // End record
  lines.push('ER  - ');
  lines.push('');

  return lines.join('\n');
}

/**
 * Map CSL type to RIS type
 */
function mapCslTypeToRis(cslType: string): string {
  const mapping: Record<string, string> = {
    'article-journal': 'JOUR',
    'article-magazine': 'MGZN',
    'article-newspaper': 'NEWS',
    book: 'BOOK',
    chapter: 'CHAP',
    'paper-conference': 'CONF',
    thesis: 'THES',
    report: 'RPRT',
    webpage: 'ELEC',
    dataset: 'DATA',
    software: 'COMP',
  };

  return mapping[cslType] || 'GEN';
}
