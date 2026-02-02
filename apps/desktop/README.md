# Zotero Ref Extractor - Desktop App

A cross-platform desktop application for extracting bibliographic references from Word documents (Zotero/Mendeley citations) and PDFs (via local GROBID).

## Features

- **Drag-and-drop interface** - Drop .docx and .pdf files directly into the app
- **Multiple output formats** - Export as CSL-JSON, BibLaTeX, BibTeX, or RIS
- **Smart deduplication** - Automatically removes duplicate references
- **GROBID integration** - Process PDFs using a local GROBID server (optional)
- **Dark/light mode** - Automatically matches your OS theme
- **Cross-platform** - Works on macOS, Windows, and Linux

## Privacy

- **Word documents (.docx)** are processed entirely locally. No data is sent anywhere.
- **PDF files** are sent to your locally-running GROBID server only. No external services are used.

## Development

### Prerequisites

- Node.js 20 or later
- The root project must be built first (`npm run build` in the repo root)

### Setup

From the repository root:

```bash
# Install all dependencies (workspaces)
npm install

# Build the core library first
npm run build

# Run the desktop app in development mode
npm run desktop:dev
```

Or from the `apps/desktop` directory:

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the app in development mode with Vite HMR |
| `npm run build` | Build the renderer and main process |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run package` | Build and package for the current platform |
| `npm run package:win` | Package for Windows (nsis installer) |
| `npm run package:mac` | Package for macOS (dmg + zip) |
| `npm run package:linux` | Package for Linux (AppImage) |

## Building for Distribution

```bash
# Package for your current platform
npm run package

# Or package for a specific platform
npm run package:win
npm run package:mac
npm run package:linux
```

Built artifacts will be placed in the `release/` directory.

## PDF Processing with GROBID

To process PDF files, you need to run a local GROBID server:

```bash
# Start GROBID with Docker
docker run -t --rm -p 8070:8070 lfoppiano/grobid:0.8.0
```

Then enter `http://localhost:8070` in the GROBID URL field under Advanced Options.

### Troubleshooting GROBID

**"GROBID is not responding"**
- Ensure GROBID is running: `curl http://localhost:8070/api/isalive`
- Check if Docker container is up: `docker ps`
- Try restarting the container

**"No references found in PDF"**
- GROBID works best with PDFs that have a clear References/Bibliography section
- Scanned PDFs with poor OCR quality may yield incomplete results
- Try using the full-text extraction mode if available

## Architecture

```
apps/desktop/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts     # App entry point, window creation
│   │   ├── preload.ts  # Secure IPC bridge
│   │   ├── ipc.ts      # IPC handlers
│   │   ├── adapters.ts # Integration with core library
│   │   └── types.ts    # Shared types & zod schemas
│   └── renderer/       # React frontend
│       ├── components/ # UI components
│       ├── lib/        # State management (zustand)
│       ├── App.tsx     # Main app component
│       └── index.html  # Entry HTML
├── electron-builder.yml
├── vite.config.ts
└── package.json
```

## Security

The app uses Electron's recommended security practices:

- `contextIsolation: true` - Renderer is isolated from Node.js
- `nodeIntegration: false` - No direct Node.js access in renderer
- `sandbox: true` - Renderer runs in a sandboxed process
- Minimal preload API - Only essential functions exposed via `contextBridge`
- IPC validation - All payloads validated with zod schemas

## License

MIT
