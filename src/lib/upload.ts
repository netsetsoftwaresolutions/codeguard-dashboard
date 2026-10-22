import type { ScanCreatedResponse } from '../contracts';
import { ApiError, CSRF_HEADER, parseErrorBody, redirectToLogin } from './api';

export type UploadMode = 'files' | 'folder' | 'archive';

export const ARCHIVE_EXTENSIONS = ['.zip', '.tar', '.tar.gz', '.tgz'] as const;

export function isArchiveName(name: string): boolean {
  const n = name.toLowerCase();
  return ARCHIVE_EXTENSIONS.some((ext) => n.endsWith(ext));
}

export interface UploadTarget {
  /** Existing project. Takes precedence over organizationId/projectName. */
  projectId?: string;
  organizationId?: string;
  projectName?: string;
}

export interface UploadSelection {
  mode: UploadMode;
  files: File[];
  /**
   * Relative path per file (same order as `files`). Required for folder uploads; derived from
   * `webkitRelativePath` when omitted.
   */
  relativePaths?: string[];
}

/** Path of a file inside a picked/dropped folder, falling back to the bare file name. */
export function relativePathOf(file: File): string {
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return rel && rel.length > 0 ? rel : file.name;
}

export function totalBytes(files: File[]): number {
  return files.reduce((s, f) => s + f.size, 0);
}

export interface UploadValidation {
  ok: boolean;
  error?: string;
}

export function validateUpload(sel: UploadSelection, maxBytes: number | null): UploadValidation {
  if (sel.files.length === 0) return { ok: false, error: 'Select at least one file.' };
  if (sel.mode === 'archive') {
    if (sel.files.length !== 1) return { ok: false, error: 'Upload a single archive at a time.' };
    if (!isArchiveName(sel.files[0].name)) return { ok: false, error: 'Archives must be .zip, .tar, .tar.gz or .tgz.' };
  }
  if (sel.mode === 'folder' && sel.relativePaths && sel.relativePaths.length !== sel.files.length) {
    return { ok: false, error: 'Folder paths do not match the selected files.' };
  }
  if (maxBytes !== null && totalBytes(sel.files) > maxBytes) {
    return { ok: false, error: `The selection exceeds the upload limit for this server.` };
  }
  return { ok: true };
}

/**
 * Builds the multipart body for `POST /api/scans/upload`.
 * - archive → a single `files` entry
 * - files   → one `files` entry per file
 * - folder  → one `files` entry per file + `relativePaths` JSON array aligned with `files`
 */
export function buildUploadFormData(sel: UploadSelection, target: UploadTarget, enableAi: boolean): FormData {
  const fd = new FormData();
  if (target.projectId) {
    fd.append('projectId', target.projectId);
  } else {
    if (!target.organizationId) throw new Error('organizationId is required when no project is selected');
    fd.append('organizationId', target.organizationId);
    if (target.projectName && target.projectName.trim()) fd.append('projectName', target.projectName.trim());
  }
  fd.append('enableAi', enableAi ? 'true' : 'false');
  if (sel.mode === 'folder') {
    const paths = sel.relativePaths ?? sel.files.map(relativePathOf);
    fd.append('relativePaths', JSON.stringify(paths));
  }
  for (const f of sel.files) fd.append('files', f, f.name);
  return fd;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

/**
 * Sends the upload with XMLHttpRequest (fetch has no upload-progress events), keeping the same
 * cookie credentials and CSRF header as every other mutation.
 */
export function uploadScan(
  formData: FormData,
  onProgress?: (p: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<ScanCreatedResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/scans/upload');
    xhr.withCredentials = true;
    xhr.setRequestHeader(CSRF_HEADER, '1');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = (e) => {
      if (!onProgress || !e.lengthComputable) return;
      onProgress({ loaded: e.loaded, total: e.total, percent: Math.round((e.loaded / e.total) * 100) });
    };
    xhr.onload = () => {
      let parsed: unknown = null;
      try {
        parsed = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        parsed = xhr.responseText;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parsed as ScanCreatedResponse);
        return;
      }
      if (xhr.status === 401) redirectToLogin();
      reject(parseErrorBody(xhr.status, parsed));
    };
    xhr.onerror = () => reject(new ApiError(0, 'The upload failed due to a network error.'));
    xhr.onabort = () => reject(new ApiError(0, 'Upload cancelled.'));
    if (signal) signal.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(formData);
  });
}
