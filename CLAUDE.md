# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # Compile TypeScript to dist/
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
npm run typecheck      # Type check without emitting
npm run dev -- <args>  # Run CLI in dev mode (tsx), e.g.: npm run dev -- paper.docx -f biblatex
```

Run a single test file:
```bash
npx vitest run test/docx.test.ts
```

Run a single test by name:
```bash
npx vitest run -t "should extract citations"
```

## Architecture

### Data Flow

```
Input files (.docx, .pdf)
    ↓
Extractors (src/extractors/)
    - docx.ts: ZIP → XML → instrText nodes → balanced JSON extraction → CSL items
    - pdf.ts: GROBID API → TEI XML → CSL items
    ↓
ExtractedRef[] (item + source metadata)
    ↓
Normalizer (src/core/normalize.ts)
    - Deduplication by: DOI → URL → title+year+author
    - Merges fields from duplicates
    - Sorts by author/year/title
    ↓
CslItem[]
    ↓
Converter (src/convert/citationJs.ts)
    - Uses citation-js for format conversion
    ↓
Output: CSL-JSON | BibLaTeX | BibTeX | RIS
```

### DOCX Extraction Details

Zotero/Mendeley embed citations in `<w:instrText>` XML nodes with markers like `ADDIN ZOTERO_ITEM CSL_CITATION {...}`. The JSON payload often spans multiple `<w:instrText>` runs split across XML elements. The extractor:

1. Recursively collects all `w:instrText` content from the parsed XML tree
2. Concatenates into a single string
3. Finds citation markers and extracts balanced JSON using brace counting (handles nested objects and escaped strings)
4. Validates with zod schemas (`ZoteroCitationSchema`, `CslItemSchema`)

### Type Declarations

The `src/types/` directory contains `.d.ts` files for packages without TypeScript types:
- `citation-js.d.ts` - citation-js library
- `yauzl-promise.d.ts` - yauzl-promise ZIP library

These are registered in `tsconfig.json` via `typeRoots`.

## Test Fixtures

Test fixtures are generated programmatically in `test/fixtures/createFixtures.ts`. The script creates minimal valid DOCX files (ZIP archives with required XML structure) containing Zotero citation fields. Run the fixture generator before tests if fixtures are missing.

## Key Types

- `CslItem`: CSL-JSON bibliographic item (validated by zod)
- `ExtractedRef`: CSL item + extraction source metadata
- `OutputFormat`: Enum for csl/biblatex/bibtex/ris

## Desktop App (apps/desktop)

Electron + React + Vite desktop wrapper for the core extraction library.

### Desktop Commands

```bash
npm run desktop:dev      # Run desktop app in dev mode with HMR
npm run desktop:build    # Build the desktop app
npm run desktop:package  # Package for distribution
```

Or from `apps/desktop`:

```bash
npm run dev              # Dev mode
npm run build            # Build
npm run package          # Package for current platform
```

### Desktop Structure

```text
apps/desktop/
├── src/main/           # Electron main process (TypeScript)
│   ├── main.ts         # Window creation, app lifecycle
│   ├── preload.ts      # Secure IPC bridge (contextBridge)
│   ├── ipc.ts          # IPC handlers
│   ├── adapters.ts     # Dynamic import of core library
│   └── types.ts        # Shared types + zod schemas
└── src/renderer/       # React + Vite frontend
    ├── components/     # FileDrop, OptionsForm, ProgressLog, Summary
    ├── lib/state.ts    # Zustand store
    └── App.tsx
```

### Core Integration

The desktop app dynamically imports the built core library from `dist/index.js`. The core library must be built first (`npm run build` in root).

### Security

- contextIsolation: true
- nodeIntegration: false
- sandbox: true
- Minimal preload API via contextBridge
- IPC payloads validated with zod

## Windows Development Notes

- **Never create files with Windows reserved names**: `nul`, `con`, `prn`, `aux`, `com1`-`com9`, `lpt1`-`lpt9` (case insensitive). These cause Git failures on Windows.
- Use PowerShell semicolon `;` instead of `&&` for chaining commands, or run commands separately.
- The `apps/desktop/run-electron.bat` script is needed for dev mode on Windows with Git Bash (clears `ELECTRON_RUN_AS_NODE` environment variable).
