#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { writeFile } from 'node:fs/promises';
import { resolve, dirname, basename, join } from 'node:path';
import { OutputFormat, LogLevel, ExtractedRef, ExtractionResult } from './core/types.js';
import { normalizeRefs } from './core/normalize.js';
import { extractFromDocx } from './extractors/docx.js';
import { extractFromPdf, checkGrobidHealth } from './extractors/pdf.js';
import { convertToFormat } from './convert/citationJs.js';
import { expandInputPaths, getExtension, isDirectory, pathExists } from './io/fs.js';
import { log } from './util/log.js';
import { ExtractorError, GrobidUnavailableError } from './util/errors.js';

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('zotero-ref-extract')
    .usage('$0 <input...> [options]')
    .command('$0 <input...>', 'Extract references from Word documents or PDFs')
    .positional('input', {
      describe: 'Input files or directories (.docx, .pdf)',
      type: 'string',
      array: true,
      demandOption: true,
    })
    .option('format', {
      alias: 'f',
      describe: 'Output format',
      choices: ['csl', 'biblatex', 'bibtex', 'ris'] as const,
      default: 'csl' as const,
    })
    .option('pdf-via-grobid', {
      describe: 'GROBID server URL for PDF processing',
      type: 'string',
    })
    .option('out', {
      alias: 'o',
      describe: 'Output file or directory (default: stdout)',
      type: 'string',
    })
    .option('minify', {
      alias: 'm',
      describe: 'Minify JSON output',
      type: 'boolean',
      default: false,
    })
    .option('fail-on-empty', {
      describe: 'Exit with error if no references found',
      type: 'boolean',
      default: false,
    })
    .option('log-level', {
      describe: 'Logging verbosity',
      choices: ['silent', 'info', 'debug'] as const,
      default: 'info' as const,
    })
    .example('$0 paper.docx', 'Extract references from a Word document to stdout')
    .example('$0 paper.docx -f biblatex -o refs.bib', 'Export as BibLaTeX')
    .example('$0 papers/ -f ris -o refs/', 'Process all files in a directory')
    .example(
      '$0 paper.pdf --pdf-via-grobid http://localhost:8070',
      'Extract from PDF using GROBID'
    )
    .help()
    .version()
    .strict()
    .parseAsync();

  // Configure logging
  log.setLevel(argv.logLevel as LogLevel);

  const format = argv.format as OutputFormat;
  const inputs = argv.input as string[];
  const grobidUrl = argv.pdfViaGrobid;
  const outputPath = argv.out;
  const minify = argv.minify;
  const failOnEmpty = argv.failOnEmpty;

  try {
    // Expand input paths
    const extensions = grobidUrl ? ['docx', 'pdf'] : ['docx'];
    const files = await expandInputPaths(inputs, extensions);

    if (files.length === 0) {
      log.error('No input files found');
      process.exit(1);
    }

    log.header('Processing files');
    files.forEach((f) => log.listItem(basename(f)));

    // Check GROBID availability if PDFs are present
    const hasPdfs = files.some((f) => getExtension(f) === 'pdf');
    if (hasPdfs && grobidUrl) {
      log.info(`Checking GROBID at ${grobidUrl}...`);
      const isAlive = await checkGrobidHealth(grobidUrl);
      if (!isAlive) {
        throw new GrobidUnavailableError(grobidUrl, 'Service not responding');
      }
      log.success('GROBID is available');
    } else if (hasPdfs && !grobidUrl) {
      log.warn('PDF files found but --pdf-via-grobid not specified. Skipping PDFs.');
    }

    // Process all files
    const allRefs: ExtractedRef[] = [];
    const allWarnings: string[] = [];
    const allErrors: string[] = [];
    let totalCitations = 0;

    for (const file of files) {
      const ext = getExtension(file);

      try {
        if (ext === 'docx') {
          log.info(`Processing: ${basename(file)}`);
          const result = await extractFromDocx(file);
          allRefs.push(...result.refs);
          allWarnings.push(...result.warnings);
          totalCitations += result.refs.length;
        } else if (ext === 'pdf' && grobidUrl) {
          log.info(`Processing via GROBID: ${basename(file)}`);
          const result = await extractFromPdf(file, { baseUrl: grobidUrl });
          allRefs.push(...result.refs);
          allWarnings.push(...result.warnings);
          totalCitations += result.refs.length;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        allErrors.push(`${basename(file)}: ${message}`);
        log.error(`Failed to process ${basename(file)}: ${message}`);
      }
    }

    // Normalize and dedupe
    const { items, duplicatesRemoved } = normalizeRefs(allRefs);

    // Build result
    const result: ExtractionResult = {
      items,
      warnings: allWarnings,
      errors: allErrors,
      stats: {
        totalCitations,
        uniqueItems: items.length,
        duplicatesRemoved,
      },
    };

    // Print warnings
    if (result.warnings.length > 0) {
      log.blank();
      for (const warning of result.warnings) {
        log.warn(warning);
      }
    }

    // Print stats
    log.stats({
      'Total citations found': result.stats.totalCitations,
      'Unique references': result.stats.uniqueItems,
      'Duplicates removed': result.stats.duplicatesRemoved,
      'Files processed': files.length,
      'Errors': result.errors.length,
    });

    // Check for empty results
    if (items.length === 0) {
      if (failOnEmpty) {
        log.error('No references extracted (--fail-on-empty specified)');
        process.exit(1);
      }
      log.warn('No references extracted');
      return;
    }

    // Convert to output format
    const output = convertToFormat(items, format, { minify });

    // Write output
    if (outputPath) {
      await writeOutput(output, outputPath, format);
      log.success(`Output written to: ${outputPath}`);
    } else {
      // Write to stdout
      console.log(output);
    }
  } catch (error) {
    if (error instanceof ExtractorError) {
      log.error(error.message);
      log.debug(JSON.stringify(error.details, null, 2));
    } else if (error instanceof Error) {
      log.error(error.message);
      if (log.getLevel() === LogLevel.Debug) {
        console.error(error.stack);
      }
    } else {
      log.error(String(error));
    }
    process.exit(1);
  }
}

/**
 * Write output to file or directory
 */
async function writeOutput(content: string, outputPath: string, format: OutputFormat): Promise<void> {
  const resolved = resolve(outputPath);

  // Check if output is a directory
  if (await isDirectory(resolved)) {
    const ext = getFormatExtension(format);
    const filename = `references${ext}`;
    await writeFile(join(resolved, filename), content, 'utf-8');
  } else {
    // Ensure parent directory exists
    const dir = dirname(resolved);
    if (!(await pathExists(dir))) {
      throw new Error(`Output directory does not exist: ${dir}`);
    }
    await writeFile(resolved, content, 'utf-8');
  }
}

/**
 * Get file extension for output format
 */
function getFormatExtension(format: OutputFormat): string {
  switch (format) {
    case OutputFormat.CSL:
      return '.json';
    case OutputFormat.BibLaTeX:
    case OutputFormat.BibTeX:
      return '.bib';
    case OutputFormat.RIS:
      return '.ris';
    default:
      return '.txt';
  }
}

// Run CLI
main();
