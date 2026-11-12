import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_DROP_DEPTH, selectionFromDataTransfer } from '@/lib/drop';
import { buildUploadFormData, isArchiveName, uploadScan, validateUpload } from '@/lib/upload';

function file(name: string, size = 10, rel?: string): File {
  const f = new File(['x'.repeat(size)], name);
  if (rel) Object.defineProperty(f, 'webkitRelativePath', { value: rel });
  return f;
}

describe('upload form data', () => {
  it('sends relativePaths aligned with files for folder uploads', () => {
    const files = [file('a.js', 5, 'proj/src/a.js'), file('package.json', 5, 'proj/package.json')];
    const fd = buildUploadFormData({ mode: 'folder', files }, { organizationId: 'org1', projectName: ' My project ' }, false);
    const sent = fd.getAll('files') as File[];
    expect(sent.map((f) => f.name)).toEqual(['a.js', 'package.json']);
    expect(JSON.parse(fd.get('relativePaths') as string)).toEqual(['proj/src/a.js', 'proj/package.json']);
    expect(fd.get('organizationId')).toBe('org1');
    expect(fd.get('projectName')).toBe('My project');
    expect(fd.get('projectId')).toBeNull();
    expect(fd.get('enableAi')).toBe('false');
  });

  it('prefers explicit relative paths (from drag & drop)', () => {
    const files = [file('a.js'), file('b.js')];
    const fd = buildUploadFormData({ mode: 'folder', files, relativePaths: ['d/a.js', 'd/sub/b.js'] }, { projectId: 'p1' }, true);
    expect(JSON.parse(fd.get('relativePaths') as string)).toEqual(['d/a.js', 'd/sub/b.js']);
    expect(fd.get('projectId')).toBe('p1');
    expect(fd.get('organizationId')).toBeNull();
    expect(fd.get('enableAi')).toBe('true');
  });

  it('does not send relativePaths for plain files or archives', () => {
    const fd = buildUploadFormData({ mode: 'files', files: [file('a.py'), file('b.py')] }, { organizationId: 'o' }, false);
    expect(fd.get('relativePaths')).toBeNull();
    expect(fd.getAll('files')).toHaveLength(2);
    const fd2 = buildUploadFormData({ mode: 'archive', files: [file('src.tar.gz')] }, { organizationId: 'o' }, false);
    expect(fd2.getAll('files')).toHaveLength(1);
    expect(fd2.get('relativePaths')).toBeNull();
  });

  it('requires an organization when no project is chosen', () => {
    expect(() => buildUploadFormData({ mode: 'files', files: [file('a')] }, {}, false)).toThrow(/organizationId/);
  });

  it('validates archive type, count and size limit', () => {
    expect(isArchiveName('x.TGZ')).toBe(true);
    expect(isArchiveName('x.rar')).toBe(false);
    expect(validateUpload({ mode: 'archive', files: [file('x.rar')] }, null).ok).toBe(false);
    expect(validateUpload({ mode: 'archive', files: [file('a.zip'), file('b.zip')] }, null).ok).toBe(false);
    expect(validateUpload({ mode: 'files', files: [file('a', 60), file('b', 50)] }, 100)).toMatchObject({ ok: false });
    expect(validateUpload({ mode: 'files', files: [file('a', 60)] }, 100)).toEqual({ ok: true });
    expect(validateUpload({ mode: 'files', files: [] }, 100).ok).toBe(false);
  });
});

describe('uploadScan (XHR)', () => {
  afterEach(() => vi.unstubAllGlobals());

  class FakeXhr {
    headers: Record<string, string> = {};
    withCredentials = false;
    method = '';
    url = '';
    status = 0;
    responseText = '';
    body: unknown;
    upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;
    open(m: string, u: string) {
      this.method = m;
      this.url = u;
    }
    setRequestHeader(k: string, v: string) {
      this.headers[k] = v;
    }
    abort() {
      this.onabort?.();
    }
    send(body: unknown) {
      this.body = body;
      this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 });
      this.status = 201;
      this.responseText = JSON.stringify({ scans: [{ id: 's1' }], scanGroupId: null });
      this.onload?.();
    }
  }

  it('posts with credentials, CSRF header and reports progress', async () => {
    const instances: FakeXhr[] = [];
    class TrackingXhr extends FakeXhr {
      constructor() {
        super();
        instances.push(this);
      }
    }
    vi.stubGlobal('XMLHttpRequest', TrackingXhr);
    const progress: number[] = [];
    const fd = new FormData();
    const res = await uploadScan(fd, (p) => progress.push(p.percent));
    expect(res.scans[0].id).toBe('s1');
    const x = instances[0];
    expect(x.method).toBe('POST');
    expect(x.url).toBe('/api/scans/upload');
    expect(x.withCredentials).toBe(true);
    expect(x.headers['X-CodeGuard-CSRF']).toBe('1');
    expect(x.body).toBe(fd);
    expect(progress).toEqual([50]);
  });

  it('rejects immediately if signal is already aborted', async () => {
    const ac = new AbortController();
    ac.abort();
    const fd = new FormData();
    await expect(uploadScan(fd, undefined, ac.signal)).rejects.toThrow('Upload cancelled.');
  });

  it('removes the abort listener after successful completion', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const ac = new AbortController();
    const removeSpy = vi.spyOn(ac.signal, 'removeEventListener');
    const fd = new FormData();
    await uploadScan(fd, undefined, ac.signal);
    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
  });
});

describe('selectionFromDataTransfer', () => {
  it('guards against circular symlinks and deep directory recursion', async () => {
    let callCount = 0;
    const circularDir: unknown = {
      isFile: false,
      isDirectory: true,
      name: 'cycle',
      createReader: () => {
        let sentBatch = false;
        return {
          readEntries: (cb: (entries: unknown[]) => void) => {
            callCount++;
            if (!sentBatch) {
              sentBatch = true;
              cb([circularDir]);
            } else {
              cb([]);
            }
          },
        };
      },
    };
    const dt = {
      items: [
        {
          kind: 'file',
          webkitGetAsEntry: () => circularDir,
        },
      ],
    } as unknown as DataTransfer;

    const res = await selectionFromDataTransfer(dt);
    expect(res).not.toBeNull();
    expect(res?.mode).toBe('folder');
    expect(callCount).toBeLessThanOrEqual((MAX_DROP_DEPTH + 2) * 2);
  });
});
