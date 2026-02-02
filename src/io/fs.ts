import { readFile, writeFile, stat, readdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import * as yauzl from 'yauzl-promise';
import { FileReadError } from '../util/errors.js';
import { log } from '../util/log.js';

/**
 * Check if a path exists
 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if path is a directory
 */
export async function isDirectory(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get file extension (lowercase, without dot)
 */
export function getExtension(filePath: string): string {
  return extname(filePath).toLowerCase().slice(1);
}

/**
 * Get base filename without extension
 */
export function getBasename(filePath: string): string {
  const ext = extname(filePath);
  return basename(filePath, ext);
}

/**
 * Read file as buffer
 */
export async function readFileBuffer(filePath: string): Promise<Buffer> {
  try {
    return await readFile(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new FileReadError(filePath, message);
  }
}

/**
 * Read file as UTF-8 string
 */
export async function readFileText(filePath: string): Promise<string> {
  const buffer = await readFileBuffer(filePath);
  return buffer.toString('utf-8');
}

/**
 * Write string content to file
 */
export async function writeFileText(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content, 'utf-8');
}

/**
 * Extract entry from a ZIP file (e.g., .docx)
 */
export interface ZipEntry {
  path: string;
  content: Buffer;
}

/**
 * Read specific files from a ZIP archive
 */
export async function readZipEntries(
  zipPath: string,
  filter: (entryPath: string) => boolean
): Promise<ZipEntry[]> {
  const entries: ZipEntry[] = [];

  try {
    const zip = await yauzl.open(zipPath);

    try {
      for await (const entry of zip) {
        if (!entry.filename.endsWith('/') && filter(entry.filename)) {
          log.debug(`Reading ZIP entry: ${entry.filename}`);
          const stream = await entry.openReadStream();
          const chunks: Buffer[] = [];

          for await (const chunk of stream) {
            chunks.push(chunk as Buffer);
          }

          entries.push({
            path: entry.filename,
            content: Buffer.concat(chunks),
          });
        }
      }
    } finally {
      await zip.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new FileReadError(zipPath, `Failed to read ZIP: ${message}`);
  }

  return entries;
}

/**
 * Read specific file from ZIP by exact path
 */
export async function readZipEntry(zipPath: string, entryPath: string): Promise<Buffer | null> {
  const entries = await readZipEntries(zipPath, (p) => p === entryPath);
  return entries.length > 0 ? entries[0].content : null;
}

/**
 * List files matching a pattern using simple glob
 */
export async function globFiles(
  directory: string,
  pattern: RegExp,
  recursive = true
): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory() && recursive) {
        await walk(fullPath);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  await walk(resolve(directory));
  return results.sort();
}

/**
 * Expand input paths (handles directories and globs)
 */
export async function expandInputPaths(
  inputs: string[],
  extensions: string[] = ['docx', 'pdf']
): Promise<string[]> {
  const files: string[] = [];
  const extPattern = new RegExp(`\\.(${extensions.join('|')})$`, 'i');

  for (const input of inputs) {
    const resolved = resolve(input);

    if (await isDirectory(resolved)) {
      const found = await globFiles(resolved, extPattern);
      files.push(...found);
    } else if (await pathExists(resolved)) {
      files.push(resolved);
    } else {
      log.warn(`Input path does not exist: ${input}`);
    }
  }

  return [...new Set(files)].sort();
}

/**
 * Create a readable stream for a file (useful for GROBID uploads)
 */
export function createFileStream(filePath: string): ReturnType<typeof createReadStream> {
  return createReadStream(filePath);
}
