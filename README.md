# zotero-ref-extract

Extract bibliographic references from Word documents (Zotero/Mendeley citations) and PDFs (via local GROBID).

## Features

- **Extract from .docx**: Parse Zotero and Mendeley citation fields embedded in Word documents
- **Extract from PDF**: Use a local GROBID service to parse bibliography sections (optional)
- **Multiple output formats**: CSL-JSON (default), BibLaTeX, BibTeX, RIS
- **Works offline**: DOCX processing requires no network; PDF processing uses local GROBID only
- **Smart deduplication**: Removes duplicates using DOI, URL, or title+author+year matching
- **Helpful diagnostics**: Clear messages when citations are plain text or use Word bookmarks

## Installation

```bash
npm install -g zotero-ref-extract
# or use directly
npx zotero-ref-extract paper.docx
```

## Usage

### Basic Examples

```bash
# Extract references from a Word document (outputs CSL-JSON to stdout)
zotero-ref-extract paper.docx

# Export as BibLaTeX to a file
zotero-ref-extract paper.docx --format biblatex --out references.bib

# Process multiple files
zotero-ref-extract chapter1.docx chapter2.docx --out refs.json

# Process all .docx files in a directory
zotero-ref-extract papers/ --out bibliography.json
```

### PDF Processing (via GROBID)

PDF extraction requires a local GROBID service:

```bash
# Start GROBID with Docker
docker run -t --rm -p 8070:8070 lfoppiano/grobid:0.8.0

# Extract from PDF
zotero-ref-extract paper.pdf --pdf-via-grobid http://localhost:8070
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--format` | `-f` | Output format: `csl`, `biblatex`, `bibtex`, `ris` | `csl` |
| `--out` | `-o` | Output file or directory | stdout |
| `--pdf-via-grobid` | | GROBID server URL for PDF processing | (disabled) |
| `--minify` | `-m` | Minify JSON output | `false` |
| `--fail-on-empty` | | Exit with error code if no refs found | `false` |
| `--log-level` | | Logging: `silent`, `info`, `debug` | `info` |

## How It Works

### DOCX Extraction

1. Opens the .docx file as a ZIP archive
2. Parses `word/document.xml` and header/footer XML files
3. Scans for `<w:instrText>` nodes containing `ADDIN ZOTERO_ITEM CSL_CITATION`
4. Extracts and parses the embedded JSON (handles multi-run text nodes)
5. Validates CSL data with zod schemas
6. Deduplicates by DOI → URL → title+year+author

### PDF Extraction (GROBID)

1. Sends the PDF to your local GROBID server's `/api/processReferences` endpoint
2. Parses the returned TEI XML
3. Converts `<biblStruct>` elements to CSL-JSON format
4. Extracts DOIs, PMIDs, and other identifiers when available

## Limitations

### DOCX

- **Plain text citations**: If citations were typed manually (not inserted via Zotero/Mendeley), they cannot be extracted. Try [AnyStyle](https://anystyle.io) or Zotero's RTF Scan feature.
- **Word bookmark citations**: Documents using Word's built-in citation feature (not Zotero) cannot be parsed. Export via Word's References → Manage Sources.
- **Old Zotero format**: Very old Zotero documents may use a different field format. Update citations in Zotero and re-save.
- **Converted documents**: If a document was "Accept All Changes" or converted to a different format, the live citation fields may be lost.

### PDF

- **Requires local GROBID**: No external service is used. You must run GROBID locally.
- **Bibliography section required**: GROBID works best on PDFs with a clear References/Bibliography section.
- **OCR quality**: Scanned PDFs with poor OCR may yield incomplete results.

## Output Formats

### CSL-JSON (default)

```json
[
  {
    "type": "article-journal",
    "title": "Example Article",
    "author": [{"family": "Smith", "given": "John"}],
    "issued": {"date-parts": [[2023]]},
    "DOI": "10.1234/example"
  }
]
```

### BibLaTeX / BibTeX

```bibtex
@article{Smith2023Example,
  author = {Smith, John},
  title = {Example Article},
  year = {2023},
  doi = {10.1234/example}
}
```

### RIS

```
TY  - JOUR
AU  - Smith, John
TI  - Example Article
PY  - 2023
DO  - 10.1234/example
ER  -
```

## Programmatic Usage

```typescript
import {
  extractFromDocx,
  extractFromPdf,
  normalizeRefs,
  convertToFormat,
  OutputFormat,
} from 'zotero-ref-extract';

// Extract from DOCX
const docxResult = await extractFromDocx('paper.docx');
console.log(`Found ${docxResult.refs.length} citations`);

// Normalize and dedupe
const { items, duplicatesRemoved } = normalizeRefs(docxResult.refs);

// Convert to BibLaTeX
const bibtex = convertToFormat(items, OutputFormat.BibLaTeX);
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build
npm run build

# Run CLI in development
npm run dev -- paper.docx --format biblatex
```

## License

MIT
