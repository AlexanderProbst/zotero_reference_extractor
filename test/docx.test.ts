import { describe, it, expect, beforeAll } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractFromDocx } from '../src/extractors/docx.js';
import { createAllFixtures, SINGLE_ITEM_CSL, MULTI_ITEM_CSL, BIBLIOGRAPHY_CSL } from './fixtures/createFixtures.js';
import { pathExists } from '../src/io/fs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures', 'word');

describe('DOCX Extractor', () => {
  beforeAll(async () => {
    // Create fixtures if they don't exist
    const singleItemPath = join(fixturesDir, 'single-item.docx');
    if (!(await pathExists(singleItemPath))) {
      await createAllFixtures();
    }
  });

  describe('Single item citation', () => {
    it('should extract a single citation from a DOCX file', async () => {
      const result = await extractFromDocx(join(fixturesDir, 'single-item.docx'));

      expect(result.hasCitations).toBe(true);
      expect(result.refs.length).toBe(1);
      expect(result.warnings.length).toBe(0);

      const ref = result.refs[0];
      expect(ref.source).toBe('docx-citation');
      expect(ref.item.type).toBe('article-journal');
      expect(ref.item.title).toBe('A Test Article About Testing');
      expect(ref.item.DOI).toBe('10.1234/test.2023.001');
      expect(ref.item.author).toHaveLength(2);
      expect(ref.item.author?.[0].family).toBe('Smith');
      expect(ref.item.author?.[0].given).toBe('John');
    });
  });

  describe('Multi-item citation', () => {
    it('should extract multiple items from a single citation', async () => {
      const result = await extractFromDocx(join(fixturesDir, 'multi-item.docx'));

      expect(result.hasCitations).toBe(true);
      expect(result.refs.length).toBe(2);
      expect(result.warnings.length).toBe(0);

      // First item - article
      const article = result.refs.find(r => r.item.type === 'article-journal');
      expect(article).toBeDefined();
      expect(article?.item.title).toBe('First Article in Multi-Citation');
      expect(article?.item.DOI).toBe('10.5678/multi.001');

      // Second item - book
      const book = result.refs.find(r => r.item.type === 'book');
      expect(book).toBeDefined();
      expect(book?.item.title).toBe('A Comprehensive Book on Testing');
      expect(book?.item.ISBN).toBe('978-1234567890');
      expect(book?.item.publisher).toBe('Academic Press');
    });
  });

  describe('Bibliography document', () => {
    it('should extract references from multiple citations', async () => {
      const result = await extractFromDocx(join(fixturesDir, 'bibliography.docx'));

      expect(result.hasCitations).toBe(true);
      // SINGLE_ITEM_CSL has 1, MULTI_ITEM_CSL has 2, BIBLIOGRAPHY_CSL has 1
      expect(result.refs.length).toBe(4);
      expect(result.warnings.length).toBe(0);

      // Check that we have all expected types
      const types = result.refs.map(r => r.item.type);
      expect(types).toContain('article-journal');
      expect(types).toContain('book');
      expect(types).toContain('paper-conference');
    });
  });

  describe('Plain text document', () => {
    it('should report no citations and emit warning', async () => {
      const result = await extractFromDocx(join(fixturesDir, 'plaintext.docx'));

      expect(result.hasCitations).toBe(false);
      expect(result.refs.length).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('No Zotero/Mendeley citation fields found');
    });
  });
});
