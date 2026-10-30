import { isArchiveName, type UploadSelection } from './upload';

interface Collected {
  file: File;
  path: string;
}

function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const out: FileSystemEntry[] = [];
    const next = () =>
      reader.readEntries((batch) => {
        if (!batch.length) resolve(out);
        else {
          out.push(...batch);
          next();
        }
      }, reject);
    next();
  });
}

export const MAX_DROP_DEPTH = 25;
export const MAX_DROP_FILES = 10_000;

async function walk(entry: FileSystemEntry, prefix: string, out: Collected[], depth = 0): Promise<void> {
  if (depth > MAX_DROP_DEPTH || out.length >= MAX_DROP_FILES) return;
  try {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
      out.push({ file, path: `${prefix}${file.name}` });
    } else if (entry.isDirectory) {
      const children = await readAllEntries((entry as FileSystemDirectoryEntry).createReader());
      for (const c of children) {
        if (out.length >= MAX_DROP_FILES) break;
        await walk(c, `${prefix}${entry.name}/`, out, depth + 1);
      }
    }
  } catch {
    // Skip unreadable or broken entries (e.g. broken symlinks)
  }
}

/**
 * Converts a drop event payload into an upload selection:
 * - one archive file → archive mode
 * - any directory → folder mode with relative paths
 * - otherwise → individual files
 */
export async function selectionFromDataTransfer(dt: DataTransfer): Promise<UploadSelection | null> {
  const entries: FileSystemEntry[] = [];
  if (dt.items && dt.items.length) {
    for (const item of Array.from(dt.items)) {
      if (item.kind !== 'file') continue;
      const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null;
      if (entry) entries.push(entry);
    }
  }
  if (entries.some((e) => e.isDirectory)) {
    const out: Collected[] = [];
    for (const e of entries) await walk(e, '', out);
    return { mode: 'folder', files: out.map((c) => c.file), relativePaths: out.map((c) => c.path) };
  }
  const files = Array.from(dt.files ?? []);
  if (!files.length) return null;
  if (files.length === 1 && isArchiveName(files[0].name)) return { mode: 'archive', files };
  return { mode: 'files', files };
}
