import { CslItem, CslName, ExtractedRef } from './types.js';
import { log } from '../util/log.js';

/**
 * Generate a stable deduplication key for a CSL item
 * Priority: DOI > URL > title+year+firstAuthor
 */
export function generateDedupeKey(item: CslItem): string {
  // Prefer DOI (normalized)
  if (item.DOI) {
    return `doi:${normalizeDoi(item.DOI)}`;
  }

  // Then URL
  if (item.URL) {
    return `url:${normalizeUrl(item.URL)}`;
  }

  // Fallback to title + year + first author
  const title = normalizeTitle(item.title || '');
  const year = extractYear(item);
  const firstAuthor = getFirstAuthorFamily(item);

  return `key:${firstAuthor}|${year}|${title}`;
}

/**
 * Normalize DOI (lowercase, remove prefix)
 */
function normalizeDoi(doi: string): string {
  return doi
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
    .replace(/^doi:/, '')
    .trim();
}

/**
 * Normalize URL (lowercase, remove trailing slash)
 */
function normalizeUrl(url: string): string {
  return url.toLowerCase().replace(/\/+$/, '').trim();
}

/**
 * Normalize title for comparison (lowercase, alphanumeric only)
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 100);
}

/**
 * Extract year from CSL item
 */
function extractYear(item: CslItem): string {
  if (item.issued?.['date-parts']?.[0]?.[0]) {
    return String(item.issued['date-parts'][0][0]);
  }
  if (item.issued?.literal) {
    const match = item.issued.literal.match(/\d{4}/);
    if (match) return match[0];
  }
  return 'unknown';
}

/**
 * Get first author's family name
 */
function getFirstAuthorFamily(item: CslItem): string {
  if (item.author && item.author.length > 0) {
    const first = item.author[0];
    if (first.family) {
      return first.family.toLowerCase().replace(/[^a-z]/g, '');
    }
    if (first.literal) {
      // Take first word of literal name
      const firstWord = first.literal.split(/\s+/)[0];
      return firstWord.toLowerCase().replace(/[^a-z]/g, '');
    }
  }
  return 'unknown';
}

/**
 * Deduplicate CSL items by stable key
 */
export function deduplicateItems(refs: ExtractedRef[]): {
  unique: CslItem[];
  duplicatesRemoved: number;
} {
  const seen = new Map<string, CslItem>();
  let duplicatesRemoved = 0;

  for (const ref of refs) {
    const key = generateDedupeKey(ref.item);

    if (seen.has(key)) {
      duplicatesRemoved++;
      log.debug(`Duplicate removed: ${key}`);

      // Merge additional data from duplicate (prefer non-empty fields)
      const existing = seen.get(key)!;
      mergeItems(existing, ref.item);
    } else {
      // Clone to avoid mutation
      seen.set(key, { ...ref.item });
    }
  }

  return {
    unique: Array.from(seen.values()),
    duplicatesRemoved,
  };
}

/**
 * Merge non-empty fields from source into target
 */
function mergeItems(target: CslItem, source: CslItem): void {
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value !== null && value !== '') {
      const targetValue = (target as Record<string, unknown>)[key];
      if (targetValue === undefined || targetValue === null || targetValue === '') {
        (target as Record<string, unknown>)[key] = value;
      }
    }
  }
}

/**
 * Sort items by first author, year, title
 */
export function sortItems(items: CslItem[]): CslItem[] {
  return [...items].sort((a, b) => {
    const authorA = getFirstAuthorFamily(a);
    const authorB = getFirstAuthorFamily(b);

    if (authorA !== authorB) {
      return authorA.localeCompare(authorB);
    }

    const yearA = extractYear(a);
    const yearB = extractYear(b);

    if (yearA !== yearB) {
      return yearA.localeCompare(yearB);
    }

    const titleA = normalizeTitle(a.title || '');
    const titleB = normalizeTitle(b.title || '');

    return titleA.localeCompare(titleB);
  });
}

/**
 * Trim whitespace from string fields
 */
export function trimItem(item: CslItem): CslItem {
  const trimmed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(item)) {
    if (typeof value === 'string') {
      trimmed[key] = value.trim();
    } else if (Array.isArray(value)) {
      trimmed[key] = value.map((v) => {
        if (typeof v === 'object' && v !== null) {
          return trimName(v as CslName);
        }
        return v;
      });
    } else {
      trimmed[key] = value;
    }
  }

  return trimmed as CslItem;
}

/**
 * Trim whitespace from name fields
 */
function trimName(name: CslName): CslName {
  const trimmed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(name)) {
    if (typeof value === 'string') {
      trimmed[key] = value.trim();
    } else {
      trimmed[key] = value;
    }
  }

  return trimmed as CslName;
}

/**
 * Normalize an array of extracted references
 * - Deduplicate by stable key
 * - Trim whitespace
 * - Sort by author/year/title
 */
export function normalizeRefs(refs: ExtractedRef[]): {
  items: CslItem[];
  duplicatesRemoved: number;
} {
  log.debug(`Normalizing ${refs.length} references`);

  // Deduplicate
  const { unique, duplicatesRemoved } = deduplicateItems(refs);

  // Trim and sort
  const trimmed = unique.map(trimItem);
  const sorted = sortItems(trimmed);

  log.debug(`After normalization: ${sorted.length} unique items`);

  return {
    items: sorted,
    duplicatesRemoved,
  };
}

/**
 * Generate a citation key for BibTeX/BibLaTeX
 * Format: AuthorYearFirstWord
 */
export function generateCiteKey(item: CslItem): string {
  const author = getFirstAuthorFamily(item) || 'unknown';
  const year = extractYear(item);
  const titleWord = getFirstTitleWord(item.title || '');

  // Capitalize first letter of author
  const authorKey = author.charAt(0).toUpperCase() + author.slice(1);

  return `${authorKey}${year}${titleWord}`;
}

/**
 * Get first significant word from title (skip articles)
 */
function getFirstTitleWord(title: string): string {
  const skipWords = new Set(['a', 'an', 'the', 'on', 'in', 'of', 'for', 'to']);
  const words = title.toLowerCase().split(/\s+/);

  for (const word of words) {
    const cleaned = word.replace(/[^a-z]/g, '');
    if (cleaned && !skipWords.has(cleaned)) {
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
  }

  return 'Untitled';
}
