/**
 * Create test fixtures (minimal DOCX files with Zotero citations)
 *
 * DOCX files are ZIP archives containing XML files.
 * This script creates minimal valid DOCX files for testing.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Writable } from 'node:stream';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal DOCX structure requires these files
const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

/**
 * Single citation CSL data
 */
export const SINGLE_ITEM_CSL = {
  citationID: "test1",
  citationItems: [
    {
      id: "item1",
      itemData: {
        type: "article-journal",
        id: "item1",
        title: "A Test Article About Testing",
        author: [
          { family: "Smith", given: "John" },
          { family: "Doe", given: "Jane" }
        ],
        issued: { "date-parts": [[2023]] },
        "container-title": "Journal of Testing",
        volume: "42",
        issue: "1",
        page: "1-15",
        DOI: "10.1234/test.2023.001"
      }
    }
  ],
  properties: {}
};

/**
 * Multi-citation CSL data
 */
export const MULTI_ITEM_CSL = {
  citationID: "test2",
  citationItems: [
    {
      id: "item2",
      itemData: {
        type: "article-journal",
        id: "item2",
        title: "First Article in Multi-Citation",
        author: [{ family: "Johnson", given: "Alice" }],
        issued: { "date-parts": [[2022]] },
        "container-title": "Science Journal",
        volume: "10",
        page: "100-110",
        DOI: "10.5678/multi.001"
      }
    },
    {
      id: "item3",
      itemData: {
        type: "book",
        id: "item3",
        title: "A Comprehensive Book on Testing",
        author: [
          { family: "Williams", given: "Bob" },
          { family: "Brown", given: "Carol" }
        ],
        issued: { "date-parts": [[2021]] },
        publisher: "Academic Press",
        "publisher-place": "New York",
        ISBN: "978-1234567890"
      }
    }
  ],
  properties: {}
};

/**
 * Bibliography-style citation
 */
export const BIBLIOGRAPHY_CSL = {
  citationID: "bibl1",
  citationItems: [
    {
      id: "item4",
      itemData: {
        type: "paper-conference",
        id: "item4",
        title: "Conference Paper About Important Topics",
        author: [{ family: "Davis", given: "Emma" }],
        issued: { "date-parts": [[2020]] },
        "container-title": "Proceedings of the International Conference",
        page: "50-60",
        DOI: "10.9999/conf.2020.005"
      }
    }
  ],
  properties: {}
};

/**
 * Create document.xml with Zotero citation fields
 */
function createDocumentXml(citations: object[]): string {
  const fieldParagraphs = citations.map((citation, index) => {
    const jsonStr = JSON.stringify(citation);
    return `
    <w:p>
      <w:r>
        <w:fldChar w:fldCharType="begin"/>
      </w:r>
      <w:r>
        <w:instrText xml:space="preserve"> ADDIN ZOTERO_ITEM CSL_CITATION ${jsonStr}</w:instrText>
      </w:r>
      <w:r>
        <w:fldChar w:fldCharType="separate"/>
      </w:r>
      <w:r>
        <w:t>(Citation ${index + 1})</w:t>
      </w:r>
      <w:r>
        <w:fldChar w:fldCharType="end"/>
      </w:r>
    </w:p>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>This is a test document with Zotero citations.</w:t>
      </w:r>
    </w:p>
    ${fieldParagraphs}
    <w:sectPr/>
  </w:body>
</w:document>`;
}

/**
 * Create a plain text document (no Zotero fields)
 */
function createPlainTextDocumentXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>This document has plain text citations like (Smith, 2023) that are not linked to a reference manager.</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Another citation: Johnson et al. (2022) found interesting results.</w:t>
      </w:r>
    </w:p>
    <w:sectPr/>
  </w:body>
</w:document>`;
}

/**
 * Create a minimal ZIP file containing the given files
 * Uses a simple uncompressed ZIP format
 */
async function createMinimalZip(files: Map<string, string>): Promise<Buffer> {
  const entries: Array<{ name: string; data: Buffer }> = [];

  for (const [name, content] of files) {
    entries.push({ name, data: Buffer.from(content, 'utf-8') });
  }

  // Build ZIP file manually (uncompressed for simplicity)
  const parts: Buffer[] = [];
  const centralDirectory: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, 'utf-8');
    const dataBuffer = entry.data;

    // Local file header
    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4); // Version needed to extract
    localHeader.writeUInt16LE(0, 6); // General purpose bit flag
    localHeader.writeUInt16LE(0, 8); // Compression method (stored)
    localHeader.writeUInt16LE(0, 10); // Last mod file time
    localHeader.writeUInt16LE(0, 12); // Last mod file date
    localHeader.writeUInt32LE(crc32(dataBuffer), 14); // CRC-32
    localHeader.writeUInt32LE(dataBuffer.length, 18); // Compressed size
    localHeader.writeUInt32LE(dataBuffer.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26); // File name length
    localHeader.writeUInt16LE(0, 28); // Extra field length
    nameBuffer.copy(localHeader, 30);

    // Central directory header
    const centralHeader = Buffer.alloc(46 + nameBuffer.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory header signature
    centralHeader.writeUInt16LE(20, 4); // Version made by
    centralHeader.writeUInt16LE(20, 6); // Version needed to extract
    centralHeader.writeUInt16LE(0, 8); // General purpose bit flag
    centralHeader.writeUInt16LE(0, 10); // Compression method
    centralHeader.writeUInt16LE(0, 12); // Last mod file time
    centralHeader.writeUInt16LE(0, 14); // Last mod file date
    centralHeader.writeUInt32LE(crc32(dataBuffer), 16); // CRC-32
    centralHeader.writeUInt32LE(dataBuffer.length, 20); // Compressed size
    centralHeader.writeUInt32LE(dataBuffer.length, 24); // Uncompressed size
    centralHeader.writeUInt16LE(nameBuffer.length, 28); // File name length
    centralHeader.writeUInt16LE(0, 30); // Extra field length
    centralHeader.writeUInt16LE(0, 32); // File comment length
    centralHeader.writeUInt16LE(0, 34); // Disk number start
    centralHeader.writeUInt16LE(0, 36); // Internal file attributes
    centralHeader.writeUInt32LE(0, 38); // External file attributes
    centralHeader.writeUInt32LE(offset, 42); // Relative offset of local header
    nameBuffer.copy(centralHeader, 46);

    parts.push(localHeader, dataBuffer);
    centralDirectory.push(centralHeader);
    offset += localHeader.length + dataBuffer.length;
  }

  // End of central directory record
  const centralDirSize = centralDirectory.reduce((sum, buf) => sum + buf.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // End of central directory signature
  eocd.writeUInt16LE(0, 4); // Number of this disk
  eocd.writeUInt16LE(0, 6); // Disk where central directory starts
  eocd.writeUInt16LE(entries.length, 8); // Number of central directory records on this disk
  eocd.writeUInt16LE(entries.length, 10); // Total number of central directory records
  eocd.writeUInt32LE(centralDirSize, 12); // Size of central directory
  eocd.writeUInt32LE(offset, 16); // Offset of start of central directory
  eocd.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([...parts, ...centralDirectory, eocd]);
}

/**
 * CRC-32 calculation for ZIP
 */
function crc32(data: Buffer): number {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Create a DOCX file
 */
async function createDocx(documentXml: string): Promise<Buffer> {
  const files = new Map<string, string>([
    ['[Content_Types].xml', CONTENT_TYPES_XML],
    ['_rels/.rels', RELS_XML],
    ['word/document.xml', documentXml],
  ]);

  return createMinimalZip(files);
}

/**
 * Create all test fixtures
 */
export async function createAllFixtures(): Promise<void> {
  const fixturesDir = join(__dirname, 'word');
  await mkdir(fixturesDir, { recursive: true });

  // Single item citation
  const singleItemDocx = await createDocx(createDocumentXml([SINGLE_ITEM_CSL]));
  await writeFile(join(fixturesDir, 'single-item.docx'), singleItemDocx);
  console.log('Created: single-item.docx');

  // Multi-item citation
  const multiItemDocx = await createDocx(createDocumentXml([MULTI_ITEM_CSL]));
  await writeFile(join(fixturesDir, 'multi-item.docx'), multiItemDocx);
  console.log('Created: multi-item.docx');

  // Bibliography (multiple separate citations)
  const bibliographyDocx = await createDocx(
    createDocumentXml([SINGLE_ITEM_CSL, MULTI_ITEM_CSL, BIBLIOGRAPHY_CSL])
  );
  await writeFile(join(fixturesDir, 'bibliography.docx'), bibliographyDocx);
  console.log('Created: bibliography.docx');

  // Plain text (no Zotero fields)
  const plaintextDocx = await createDocx(createPlainTextDocumentXml());
  await writeFile(join(fixturesDir, 'plaintext.docx'), plaintextDocx);
  console.log('Created: plaintext.docx');

  // Create expected output files for golden tests
  const expectedDir = join(__dirname, 'expected');
  await mkdir(expectedDir, { recursive: true });

  // Expected CSL output for single item
  const expectedSingleCsl = [SINGLE_ITEM_CSL.citationItems[0].itemData];
  await writeFile(
    join(expectedDir, 'single-item.json'),
    JSON.stringify(expectedSingleCsl, null, 2)
  );

  // Expected CSL output for multi item
  const expectedMultiCsl = MULTI_ITEM_CSL.citationItems.map(c => c.itemData);
  await writeFile(
    join(expectedDir, 'multi-item.json'),
    JSON.stringify(expectedMultiCsl, null, 2)
  );

  console.log('\nAll fixtures created successfully!');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createAllFixtures().catch(console.error);
}
