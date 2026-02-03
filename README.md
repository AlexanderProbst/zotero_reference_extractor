# Zotero Reference Extractor

Extract bibliographic references from Word documents (Zotero/Mendeley citations) and PDFs, then export to CSL-JSON, BibLaTeX, BibTeX, or RIS.

## Features

- **Extract from .docx**: Parse Zotero and Mendeley citation fields embedded in Word documents
- **Extract from PDF**: Parse bibliography sections using GROBID (public server included, no setup required)
- **Multiple output formats**: CSL-JSON (default), BibLaTeX, BibTeX, RIS
- **Smart deduplication**: Removes duplicates using DOI, URL, or title+author+year matching
- **Desktop app & CLI**: Use the GUI for quick tasks or the command line for automation

## Desktop App

The easiest way to use this tool is the desktop application.

### Download

Download the latest release for your platform from the [Releases page](../../releases).

- **Windows**: Download the `.exe` installer

### Usage

1. **Launch the app** and drag & drop your `.docx` or `.pdf` files
2. **Choose output format** (CSL-JSON, BibLaTeX, BibTeX, or RIS)
3. **Click Extract** to process the files
4. **Save or copy** the extracted references

### PDF Processing

PDF extraction works out of the box using a public GROBID server. For faster processing or offline use, you can run GROBID locally:

```bash
docker run -t --rm -p 8070:8070 lfoppiano/grobid:0.8.0
```

Then change the GROBID URL in Advanced Options to `http://localhost:8070`.

## Command Line (CLI)

For automation and scripting, use the CLI.

### Installation

```bash
npm install -g zotero-ref-extract
# or use directly with npx
npx zotero-ref-extract paper.docx
```

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

### PDF Processing (CLI)

```bash
# Using public GROBID server
zotero-ref-extract paper.pdf --pdf-via-grobid https://kermitt2-grobid.hf.space

# Using local GROBID (faster, no rate limits)
docker run -t --rm -p 8070:8070 lfoppiano/grobid:0.8.0
zotero-ref-extract paper.pdf --pdf-via-grobid http://localhost:8070
```

### CLI Options

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

Word documents created with Zotero or Mendeley contain hidden citation data embedded in the document XML. This tool:

1. Opens the .docx file as a ZIP archive
2. Parses `word/document.xml` and header/footer XML files
3. Finds `<w:instrText>` nodes containing `ADDIN ZOTERO_ITEM CSL_CITATION`
4. Extracts and parses the embedded JSON citation data
5. Deduplicates by DOI, URL, or title+year+author

### PDF Extraction

PDFs don't contain structured citation data, so we use [GROBID](https://github.com/kermitt2/grobid), a machine learning service that extracts bibliographic information:

1. Sends the PDF to GROBID's `/api/processReferences` endpoint
2. GROBID identifies the bibliography section and parses each reference
3. Returns structured TEI XML which is converted to CSL-JSON

**Note**: GROBID extracts references from the **bibliography section** of a PDF. It cannot extract in-text citations that don't appear in a bibliography. For documents with only in-text citations, use the original .docx file instead.

## Limitations

### DOCX

- **Plain text citations**: Manually typed citations (not inserted via Zotero/Mendeley) cannot be extracted. Try [AnyStyle](https://anystyle.io) or Zotero's RTF Scan.
- **Word bookmark citations**: Documents using Word's built-in citation feature require export via Word's References > Manage Sources.
- **Converted documents**: If a document was converted or had "Accept All Changes" applied, citation fields may be lost.

### PDF

- **Bibliography section required**: GROBID needs a clear References/Bibliography section to extract from.
- **OCR quality**: Scanned PDFs with poor OCR may yield incomplete results.
- **Public server limits**: The public GROBID server is rate-limited. For heavy use, run GROBID locally.

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

# Build core library
npm run build

# Run CLI in development
npm run dev -- paper.docx --format biblatex

# Build desktop app
npm run desktop:package
```

## License

MIT
