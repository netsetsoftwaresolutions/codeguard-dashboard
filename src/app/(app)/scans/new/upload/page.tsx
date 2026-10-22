'use client';

import { formatBytes, ProgressBar } from '../../../../../components/primitives';
import { FileArchive, Files, FolderUp, Upload, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useAuth } from '@/components/auth';
import { useMeta } from '@/components/meta';
import { AiOptIn, ProjectTargetPicker, scanDestination, toTarget, useInitialTarget } from '@/components/scan-form-bits';
import { Button, Card, CardBody, cx, FormError, Notice } from '@/components/ui';
import { selectionFromDataTransfer } from '@/lib/drop';
import { buildUploadFormData, relativePathOf, totalBytes, uploadScan, validateUpload, type UploadMode, type UploadProgress, type UploadSelection } from '@/lib/upload';

const MODES: { key: UploadMode; label: string; icon: typeof Files; hint: string }[] = [
  { key: 'files', label: 'Files', icon: Files, hint: 'Pick one or more individual files.' },
  { key: 'folder', label: 'Folder', icon: FolderUp, hint: 'Pick a whole folder; its structure is preserved.' },
  { key: 'archive', label: 'Archive', icon: FileArchive, hint: 'A single .zip, .tar, .tar.gz or .tgz file.' },
];

function UploadForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { currentOrg } = useAuth();
  const { meta } = useMeta();
  const maxBytes = meta?.limits.maxUploadBytes ?? null;
  const [mode, setMode] = useState<UploadMode>('files');
  const [selection, setSelection] = useState<UploadSelection | null>(null);
  const [target, setTarget] = useInitialTarget(params.get('projectId'));
  const [enableAi, setEnableAi] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const abortRef = useRef<AbortController | null>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const archiveRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // `webkitdirectory` is not in React's typed attributes; set it imperatively.
    folderRef.current?.setAttribute('webkitdirectory', '');
    folderRef.current?.setAttribute('directory', '');
  }, []);

  const validation = selection ? validateUpload(selection, maxBytes) : null;
  const bytes = selection ? totalBytes(selection.files) : 0;
  const paths = selection ? (selection.relativePaths ?? selection.files.map((f) => (selection.mode === 'folder' ? relativePathOf(f) : f.name))) : [];

  const pick = (m: UploadMode) => {
    setMode(m);
    (m === 'files' ? filesRef : m === 'folder' ? folderRef : archiveRef).current?.click();
  };

  const onInput = (m: UploadMode) => (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    setError(null);
    setSelection(m === 'folder' ? { mode: m, files, relativePaths: files.map(relativePathOf) } : { mode: m, files });
  };

  const submit = async () => {
    if (!selection || !currentOrg) return;
    const v = validateUpload(selection, maxBytes);
    if (!v.ok) {
      setError(new Error(v.error));
      return;
    }
    setBusy(true);
    setError(null);
    setProgress({ loaded: 0, total: bytes, percent: 0 });
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const fd = buildUploadFormData(selection, toTarget(target, currentOrg.id), enableAi);
      const res = await uploadScan(fd, setProgress, ac.signal);
      router.push(scanDestination(res));
    } catch (err) {
      setError(err);
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardBody className="space-y-5">
          <div role="radiogroup" aria-label="Upload type" className="grid gap-2 sm:grid-cols-3">
            {MODES.map(({ key, label, icon: Icon, hint }) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={mode === key}
                onClick={() => pick(key)}
                disabled={busy}
                className={cx(
                  'rounded-lg border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                  mode === key ? 'border-brand-500 bg-brand-500/5' : 'border-slate-200 hover:border-slate-300 dark:border-ink-600 dark:hover:border-ink-500',
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </span>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
              </button>
            ))}
          </div>

          <input ref={filesRef} type="file" multiple className="sr-only" onChange={onInput('files')} tabIndex={-1} aria-hidden="true" />
          <input ref={folderRef} type="file" multiple className="sr-only" onChange={onInput('folder')} tabIndex={-1} aria-hidden="true" />
          <input ref={archiveRef} type="file" accept=".zip,.tar,.tar.gz,.tgz,application/zip,application/x-tar,application/gzip" className="sr-only" onChange={onInput('archive')} tabIndex={-1} aria-hidden="true" />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setDragging(false);
              if (busy) return;
              try {
                const sel = await selectionFromDataTransfer(e.dataTransfer);
                if (sel) {
                  setMode(sel.mode);
                  setSelection(sel);
                  setError(null);
                }
              } catch (err) {
                setError(err);
              }
            }}
            className={cx(
              'flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
              dragging ? 'border-brand-500 bg-brand-500/5' : 'border-slate-300 dark:border-ink-500',
            )}
          >
            <Upload size={28} className="text-slate-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">Drag & drop files, a folder, or an archive here</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              or{' '}
              <button type="button" className="font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-400" onClick={() => pick(mode)}>
                browse
              </button>
              {maxBytes !== null && <> · Maximum {formatBytes(maxBytes)} per upload</>}
            </p>
          </div>

          {selection && (
            <div className="rounded-lg border border-slate-200 dark:border-ink-600">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2 text-sm dark:border-ink-600">
                <p>
                  <span className="font-medium">{selection.files.length}</span> {selection.files.length === 1 ? 'file' : 'files'} · {formatBytes(bytes)} ·{' '}
                  <span className="text-slate-500 dark:text-slate-400">{MODES.find((m) => m.key === selection.mode)?.label}</span>
                </p>
                <Button variant="ghost" size="sm" onClick={() => setSelection(null)} disabled={busy} icon={<X size={14} aria-hidden="true" />}>
                  Clear
                </Button>
              </div>
              <ul className="max-h-56 overflow-y-auto px-4 py-2 font-mono text-xs text-slate-600 dark:text-slate-300">
                {paths.slice(0, 200).map((p, i) => (
                  <li key={`${p}:${i}`} className="truncate py-0.5">
                    {p}
                  </li>
                ))}
                {paths.length > 200 && <li className="py-0.5 text-slate-400">…and {paths.length - 200} more</li>}
              </ul>
            </div>
          )}
          {validation && !validation.ok && <Notice tone="warning">{validation.error}</Notice>}
          {progress && (
            <div aria-live="polite">
              <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{progress.percent < 100 ? 'Uploading…' : 'Upload complete — creating scan…'}</span>
                <span className="tabular-nums">
                  {formatBytes(progress.loaded)} / {formatBytes(progress.total)} ({progress.percent}%)
                </span>
              </div>
              <ProgressBar value={progress.percent} />
            </div>
          )}
          <FormError error={error} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-5">
          <ProjectTargetPicker value={target} onChange={setTarget} suggestedName={selection?.files[0] ? (paths[0]?.split('/')[0] ?? selection.files[0].name) : undefined} />
          <AiOptIn checked={enableAi} onChange={setEnableAi} />
          <div className="flex gap-2">
            <Button onClick={submit} loading={busy} disabled={!selection || (validation !== null && !validation.ok)} className="flex-1">
              Upload & scan
            </Button>
            {busy && (
              <Button variant="outline" onClick={() => abortRef.current?.abort()}>
                Cancel
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Uploaded code is stored only for scanning and the report, under your organization&apos;s retention settings.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={null}>
      <UploadForm />
    </Suspense>
  );
}
