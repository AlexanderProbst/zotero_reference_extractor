import { describe, it, expect } from 'vitest';
import {
  generateDedupeKey,
  deduplicateItems,
  sortItems,
  trimItem,
  normalizeRefs,
  generateCiteKey,
} from '../src/core/normalize.js';
import { CslItem, ExtractedRef } from '../src/core/types.js';

describe('Normalize Module', () => {
  describe('generateDedupeKey', () => {
    it('should prefer DOI for deduplication', () => {
      const item: CslItem = {
        type: 'article-journal',
        title: 'Test Article',
        DOI: '10.1234/test.001',
        URL: 'https://example.com/article',
      };

      const key = generateDedupeKey(item);
      expect(key).toBe('doi:10.1234/test.001');
    });

    it('should normalize DOI (remove prefix, lowercase)', () => {
      const item: CslItem = {
        type: 'article-journal',
        title: 'Test',
        DOI: 'https://doi.org/10.1234/TEST.001',
      };

      const key = generateDedupeKey(item);
      expect(key).toBe('doi:10.1234/test.001');
    });

    it('should use URL when no DOI', () => {
      const item: CslItem = {
        type: 'webpage',
        title: 'Web Page',
        URL: 'https://example.com/page/',
      };

      const key = generateDedupeKey(item);
      expect(key).toBe('url:https://example.com/page');
    });

    it('should fall back to title+year+author', () => {
      const item: CslItem = {
        type: 'book',
        title: 'The Great Book!',
        author: [{ family: 'Smith', given: 'John' }],
        issued: { 'date-parts': [[2023]] },
      };

      const key = generateDedupeKey(item);
      expect(key).toBe('key:smith|2023|thegreatbook');
    });
  });

  describe('deduplicateItems', () => {
    it('should remove duplicate items by DOI', () => {
      const refs: ExtractedRef[] = [
        {
          item: { type: 'article-journal', title: 'Article 1', DOI: '10.1234/same' },
          source: 'docx-citation',
          sourceFile: 'test1.docx',
        },
        {
          item: { type: 'article-journal', title: 'Article 1 (variant)', DOI: '10.1234/same' },
          source: 'docx-citation',
          sourceFile: 'test2.docx',
        },
      ];

      const { unique, duplicatesRemoved } = deduplicateItems(refs);

      expect(unique.length).toBe(1);
      expect(duplicatesRemoved).toBe(1);
      expect(unique[0].title).toBe('Article 1');
    });

    it('should merge fields from duplicates', () => {
      const refs: ExtractedRef[] = [
        {
          item: { type: 'article-journal', title: 'Article', DOI: '10.1234/merge' },
          source: 'docx-citation',
          sourceFile: 'test.docx',
        },
        {
          item: {
            type: 'article-journal',
            title: 'Article',
            DOI: '10.1234/merge',
            volume: '42',
            page: '1-10',
          },
          source: 'docx-citation',
          sourceFile: 'test.docx',
        },
      ];

      const { unique } = deduplicateItems(refs);

      expect(unique.length).toBe(1);
      expect(unique[0].volume).toBe('42');
      expect(unique[0].page).toBe('1-10');
    });
  });

  describe('sortItems', () => {
    it('should sort by author, then year, then title', () => {
      const items: CslItem[] = [
        {
          type: 'article-journal',
          title: 'Zebra Research',
          author: [{ family: 'Zebra', given: 'Z' }],
          issued: { 'date-parts': [[2020]] },
        },
        {
          type: 'article-journal',
          title: 'Alpha Study',
          author: [{ family: 'Alpha', given: 'A' }],
          issued: { 'date-parts': [[2021]] },
        },
        {
          type: 'article-journal',
          title: 'Alpha Earlier',
          author: [{ family: 'Alpha', given: 'A' }],
          issued: { 'date-parts': [[2020]] },
        },
      ];

      const sorted = sortItems(items);

      expect(sorted[0].title).toBe('Alpha Earlier');
      expect(sorted[1].title).toBe('Alpha Study');
      expect(sorted[2].title).toBe('Zebra Research');
    });
  });

  describe('trimItem', () => {
    it('should trim whitespace from string fields', () => {
      const item: CslItem = {
        type: 'article-journal',
        title: '  Test Article  ',
        DOI: ' 10.1234/test ',
      };

      const trimmed = trimItem(item);

      expect(trimmed.title).toBe('Test Article');
      expect(trimmed.DOI).toBe('10.1234/test');
    });

    it('should trim whitespace from author names', () => {
      const item: CslItem = {
        type: 'article-journal',
        title: 'Test',
        author: [{ family: ' Smith ', given: ' John ' }],
      };

      const trimmed = trimItem(item);

      expect(trimmed.author?.[0].family).toBe('Smith');
      expect(trimmed.author?.[0].given).toBe('John');
    });
  });

  describe('generateCiteKey', () => {
    it('should generate AuthorYearTitle format', () => {
      const item: CslItem = {
        type: 'article-journal',
        title: 'Machine Learning Applications',
        author: [{ family: 'Smith', given: 'John' }],
        issued: { 'date-parts': [[2023]] },
      };

      const key = generateCiteKey(item);
      expect(key).toBe('Smith2023Machine');
    });

    it('should skip common articles in title', () => {
      const item: CslItem = {
        type: 'article-journal',
        title: 'The Great Study of Testing',
        author: [{ family: 'Jones', given: 'Jane' }],
        issued: { 'date-parts': [[2022]] },
      };

      const key = generateCiteKey(item);
      expect(key).toBe('Jones2022Great');
    });

    it('should handle missing author', () => {
      const item: CslItem = {
        type: 'report',
        title: 'Anonymous Report',
        issued: { 'date-parts': [[2021]] },
      };

      const key = generateCiteKey(item);
      expect(key).toBe('Unknown2021Anonymous');
    });
  });

  describe('normalizeRefs', () => {
    it('should dedupe, trim, and sort in one pass', () => {
      const refs: ExtractedRef[] = [
        {
          item: {
            type: 'article-journal',
            title: ' Zebra Study ',
            author: [{ family: 'Zebra', given: 'Z' }],
            DOI: '10.1234/zebra',
            issued: { 'date-parts': [[2022]] },
          },
          source: 'docx-citation',
          sourceFile: 'test.docx',
        },
        {
          item: {
            type: 'article-journal',
            title: 'Alpha Work',
            author: [{ family: 'Alpha', given: 'A' }],
            DOI: '10.1234/alpha',
            issued: { 'date-parts': [[2021]] },
          },
          source: 'docx-citation',
          sourceFile: 'test.docx',
        },
        {
          item: {
            type: 'article-journal',
            title: 'Zebra Study (dupe)',
            author: [{ family: 'Zebra', given: 'Z' }],
            DOI: '10.1234/zebra',
            issued: { 'date-parts': [[2022]] },
          },
          source: 'docx-citation',
          sourceFile: 'test.docx',
        },
      ];

      const { items, duplicatesRemoved } = normalizeRefs(refs);

      expect(items.length).toBe(2);
      expect(duplicatesRemoved).toBe(1);
      expect(items[0].title).toBe('Alpha Work'); // Sorted first
      expect(items[1].title).toBe('Zebra Study'); // Trimmed
    });
  });
});
