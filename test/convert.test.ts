import { describe, it, expect } from 'vitest';
import { convertToFormat } from '../src/convert/citationJs.js';
import { OutputFormat, CslItem } from '../src/core/types.js';

describe('Citation Converter', () => {
  const sampleItem: CslItem = {
    type: 'article-journal',
    id: 'Smith2023Test',
    title: 'A Test Article About Testing',
    author: [
      { family: 'Smith', given: 'John' },
      { family: 'Doe', given: 'Jane' },
    ],
    issued: { 'date-parts': [[2023]] },
    'container-title': 'Journal of Testing',
    volume: '42',
    issue: '1',
    page: '1-15',
    DOI: '10.1234/test.2023.001',
  };

  const bookItem: CslItem = {
    type: 'book',
    id: 'Johnson2022Book',
    title: 'Comprehensive Guide to Testing',
    author: [{ family: 'Johnson', given: 'Alice' }],
    issued: { 'date-parts': [[2022]] },
    publisher: 'Academic Press',
    'publisher-place': 'New York',
    ISBN: '978-1234567890',
  };

  describe('CSL-JSON output', () => {
    it('should output valid JSON array', () => {
      const output = convertToFormat([sampleItem], OutputFormat.CSL);
      const parsed = JSON.parse(output);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
      expect(parsed[0].title).toBe('A Test Article About Testing');
    });

    it('should support minified output', () => {
      const normal = convertToFormat([sampleItem], OutputFormat.CSL, { minify: false });
      const minified = convertToFormat([sampleItem], OutputFormat.CSL, { minify: true });

      expect(minified.length).toBeLessThan(normal.length);
      expect(minified).not.toContain('\n');
    });

    it('should handle multiple items', () => {
      const output = convertToFormat([sampleItem, bookItem], OutputFormat.CSL);
      const parsed = JSON.parse(output);

      expect(parsed.length).toBe(2);
    });
  });

  describe('BibLaTeX output', () => {
    it('should output valid BibLaTeX', () => {
      const output = convertToFormat([sampleItem], OutputFormat.BibLaTeX);

      expect(output).toContain('@article{');
      expect(output).toContain('Smith, John');
      // citation-js wraps title words in braces for capitalization preservation
      expect(output).toContain('title = {');
      expect(output).toContain('Test');
      expect(output).toContain('doi = {10.1234/test.2023.001}');
    });

    it('should map book type correctly', () => {
      const output = convertToFormat([bookItem], OutputFormat.BibLaTeX);

      expect(output).toContain('@book{');
      expect(output).toContain('publisher = {Academic Press}');
    });

    it('should generate cite keys', () => {
      const output = convertToFormat([sampleItem], OutputFormat.BibLaTeX);

      // Should contain a citation key
      expect(output).toMatch(/@article\{[A-Za-z0-9]+,/);
    });
  });

  describe('BibTeX output', () => {
    it('should output valid BibTeX', () => {
      const output = convertToFormat([sampleItem], OutputFormat.BibTeX);

      expect(output).toContain('@article{');
      expect(output).toContain('author = {');
      expect(output).toContain('title = {');
      expect(output).toContain('year = {2023}');
    });
  });

  describe('RIS output', () => {
    it('should output valid RIS', () => {
      const output = convertToFormat([sampleItem], OutputFormat.RIS);

      expect(output).toContain('TY  - JOUR');
      expect(output).toContain('AU  - Smith, John');
      expect(output).toContain('TI  - A Test Article About Testing');
      expect(output).toContain('PY  - 2023');
      expect(output).toContain('DO  - 10.1234/test.2023.001');
      expect(output).toContain('ER  - ');
    });

    it('should handle book type', () => {
      const output = convertToFormat([bookItem], OutputFormat.RIS);

      expect(output).toContain('TY  - BOOK');
      expect(output).toContain('PB  - Academic Press');
    });

    it('should handle page ranges', () => {
      const output = convertToFormat([sampleItem], OutputFormat.RIS);

      // citation-js may use SP for entire range or split SP/EP
      expect(output).toMatch(/SP\s+-\s+1/);
    });
  });

  describe('Edge cases', () => {
    it('should handle items without IDs', () => {
      const noIdItem: CslItem = {
        type: 'article-journal',
        title: 'No ID Article',
        author: [{ family: 'Test', given: 'T' }],
        issued: { 'date-parts': [[2024]] },
      };

      // Should not throw
      const output = convertToFormat([noIdItem], OutputFormat.BibLaTeX);
      expect(output).toContain('@article{');
    });

    it('should handle items with literal author names', () => {
      const literalAuthor: CslItem = {
        type: 'report',
        title: 'Organization Report',
        author: [{ literal: 'World Health Organization' }],
        issued: { 'date-parts': [[2023]] },
      };

      const output = convertToFormat([literalAuthor], OutputFormat.BibLaTeX);
      expect(output).toContain('World Health Organization');
    });

    it('should handle empty arrays', () => {
      const output = convertToFormat([], OutputFormat.CSL);
      expect(output).toBe('[]');
    });
  });
});
