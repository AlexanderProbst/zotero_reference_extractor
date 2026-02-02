import { basename, extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ExtractRequest,
  ExtractResult,
  ExtractSummary,
  OutputFormat,
} from './types.js';

// Get the directory of this file
const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve path to the core library's built output
// From apps/desktop/dist-electron/ -> apps/desktop/ -> apps/ -> root/ -> dist/
const coreLibPath = join(__dirname, '..', '..', '..', '..', 'dist', 'index.js');

// Lazy-loaded core library
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let coreLib: any = null;

/**
 * Load the core library dynamically
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadCoreLib(): Promise<any> {
  if (!coreLib) {
    const pathUrl = `file://${coreLibPath.replace(/\\/g, '/')}`;
    coreLib = await import(pathUrl);
  }
  return coreLib;
}

/**
 * Map our format enum to the core library's OutputFormat enum
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOutputFormat(format: OutputFormat, coreOutputFormat: any): any {
  switch (format) {
    case 'csl':
      return coreOutputFormat.CSL;
    case 'biblatex':
      return coreOutputFormat.BibLaTeX;
    case 'bibtex':
      return coreOutputFormat.BibTeX;
    case 'ris':
      return coreOutputFormat.RIS;
    default:
      return coreOutputFormat.CSL;
  }
}

/**
 * Get file extension for output format
 */
function getFormatExtension(format: OutputFormat): string {
  switch (format) {
    case 'csl':
      return '.json';
    case 'biblatex':
    case 'bibtex':
      return '.bib';
    case 'ris':
      return '.ris';
    default:
      return '.txt';
  }
}

/**
 * Run the extraction process
 */
export async function runExtraction(
  request: ExtractRequest,
  logger: (msg: string) => void
): Promise<ExtractResult> {
  const { files, format, grobidUrl, minify, failOnEmpty, logLevel } = request;

  // Load the core library
  const core = await loadCoreLib();
  const {
    extractFromDocx,
    extractFromPdf,
    checkGrobidHealth,
    normalizeRefs,
    convertToFormat,
    OutputFormat: CoreOutputFormat,
    log,
  } = core;

  // Configure logging
  log.setLevel(logLevel);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRefs: any[] = [];
  const warnings: string[] = [];
  let totalItems = 0;

  // Check GROBID availability if we have PDFs
  const hasPdfs = files.some((f) => extname(f).toLowerCase() === '.pdf');
  let grobidAvailable = false;

  if (hasPdfs && grobidUrl) {
    logger(`Checking GROBID availability at ${grobidUrl}...`);
    grobidAvailable = await checkGrobidHealth(grobidUrl);
    if (grobidAvailable) {
      logger('GROBID is available.');
    } else {
      logger('Warning: GROBID is not responding. PDF files will be skipped.');
      warnings.push(`GROBID service at ${grobidUrl} is not responding. PDF files were skipped.`);
    }
  } else if (hasPdfs && !grobidUrl) {
    warnings.push(
      'PDF files found but no GROBID URL provided. Configure a GROBID URL in Advanced settings to process PDFs.'
    );
  }

  // Process each file
  for (const filePath of files) {
    const ext = extname(filePath).toLowerCase();
    const fileName = basename(filePath);

    try {
      if (ext === '.docx') {
        logger(`Processing DOCX: ${fileName}`);
        const result = await extractFromDocx(filePath);

        if (result.refs.length > 0) {
          allRefs.push(...result.refs);
          totalItems += result.refs.length;
          logger(`  Found ${result.refs.length} citation(s)`);
        } else {
          logger(`  No citations found`);
        }

        // Add any warnings from the extractor
        if (result.warnings.length > 0) {
          warnings.push(...result.warnings);
          result.warnings.forEach((w: string) => logger(`  Warning: ${w}`));
        }
      } else if (ext === '.pdf') {
        if (grobidUrl && grobidAvailable) {
          logger(`Processing PDF via GROBID: ${fileName}`);
          const result = await extractFromPdf(filePath, { baseUrl: grobidUrl });

          if (result.refs.length > 0) {
            allRefs.push(...result.refs);
            totalItems += result.refs.length;
            logger(`  Found ${result.refs.length} reference(s)`);
          } else {
            logger(`  No references found`);
          }

          // Add any warnings
          if (result.warnings.length > 0) {
            warnings.push(...result.warnings);
            result.warnings.forEach((w: string) => logger(`  Warning: ${w}`));
          }
        } else {
          logger(`Skipping PDF (no GROBID): ${fileName}`);
        }
      } else {
        logger(`Skipping unsupported file: ${fileName}`);
        warnings.push(`Unsupported file type: ${fileName}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger(`Error processing ${fileName}: ${message}`);
      warnings.push(`Error processing ${fileName}: ${message}`);
    }
  }

  // Handle empty results
  if (allRefs.length === 0) {
    if (failOnEmpty) {
      throw new Error('No references found in any input file');
    }

    // Return empty result
    const summary: ExtractSummary = {
      totalInputs: files.length,
      totalItems: 0,
      dedupedItems: 0,
      warnings,
    };

    return {
      success: true,
      summary,
      output: format === 'csl' ? '[]' : '',
      outputSuggestedName: generateOutputFilename(files[0], format),
    };
  }

  // Normalize and deduplicate
  logger('Normalizing and deduplicating references...');
  const { items, duplicatesRemoved } = normalizeRefs(allRefs);
  logger(`  ${items.length} unique reference(s) after deduplication`);

  if (duplicatesRemoved > 0) {
    logger(`  Removed ${duplicatesRemoved} duplicate(s)`);
  }

  // Convert to output format
  logger(`Converting to ${format.toUpperCase()} format...`);
  const coreFormat = mapOutputFormat(format, CoreOutputFormat);
  const output = convertToFormat(items, coreFormat, { minify });

  // Build summary
  const summary: ExtractSummary = {
    totalInputs: files.length,
    totalItems,
    dedupedItems: items.length,
    warnings,
  };

  return {
    success: true,
    summary,
    output,
    outputSuggestedName: generateOutputFilename(files[0], format),
  };
}

/**
 * Generate a suggested output filename based on the first input file
 */
function generateOutputFilename(firstFile: string, format: OutputFormat): string {
  const base = basename(firstFile, extname(firstFile));
  const ext = getFormatExtension(format);
  return `${base}-refs${ext}`;
}
