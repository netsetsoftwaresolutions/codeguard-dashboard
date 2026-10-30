'use client';

import type { SourceInspection } from '../../../../../contracts';
import { parseSourceUrl, UrlScanSchema } from '../../../../../contracts';
import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth';
import { AiOptIn, InspectionResult, ParsedPreview, ProjectTargetPicker, scanDestination, toTarget, useInitialTarget } from '@/components/scan-form-bits';
import { Button, Card, CardBody, Field, FormError, Input } from '@/components/ui';
import { api } from '@/lib/api';
import { validate } from '@/lib/validation';

function UrlForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { currentOrg } = useAuth();
  const [url, setUrl] = useState(params.get('url') ?? '');
  const [target, setTarget] = useInitialTarget(params.get('projectId'));
  const [enableAi, setEnableAi] = useState(false);
  const [inspection, setInspection] = useState<SourceInspection | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const trimmed = url.trim();
  const parsed = useMemo(() => {
    if (!trimmed) return null;
    try {
      return parseSourceUrl(trimmed);
    } catch {
      return null;
    }
  }, [trimmed]);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardBody className="space-y-5">
          <Field htmlFor="scan-url" label="Source URL" hint="Repository, file, pull request, Dropbox / Google Drive share link, raw file or archive URL.">
            <div className="flex gap-2">
              <Input
                id="scan-url"
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://github.com/owner/repo"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setInspection(null);
                  setInspectError(null);
                }}
                maxLength={2048}
              />
              <Button
                variant="outline"
                loading={inspecting}
                disabled={!parsed?.supported}
                icon={<Search size={14} aria-hidden="true" />}
                onClick={async () => {
                  setInspecting(true);
                  setInspectError(null);
                  try {
                    setInspection(await api.sources.inspect(trimmed, currentOrg?.id));
                  } catch (e) {
                    setInspectError(e);
                  } finally {
                    setInspecting(false);
                  }
                }}
              >
                Inspect
              </Button>
            </div>
          </Field>
          {parsed && <ParsedPreview parsed={parsed} />}
          <FormError error={inspectError} />
          {inspection && <InspectionResult inspection={inspection} />}
        </CardBody>
      </Card>
      <Card>
        <CardBody className="space-y-5">
          <ProjectTargetPicker value={target} onChange={setTarget} suggestedName={parsed?.supported ? parsed.label : undefined} />
          <AiOptIn checked={enableAi} onChange={setEnableAi} />
          <FormError error={error} />
          <Button
            className="w-full"
            loading={busy}
            disabled={!parsed?.supported || !currentOrg}
            onClick={async () => {
              if (!currentOrg) return;
              const v = validate(UrlScanSchema, {
                target: toTarget(target, currentOrg.id),
                url: trimmed,
                options: { enableAi, includeHistory: false, historyDepth: 50, excludePaths: [] },
              });
              if (!v.ok) {
                setError(new Error(Object.values(v.errors)[0]));
                return;
              }
              setBusy(true);
              setError(null);
              try {
                router.push(scanDestination(await api.scans.url(v.data)));
              } catch (err) {
                setError(err);
                setBusy(false);
              }
            }}
          >
            Start scan
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

export default function UrlScanPage() {
  return (
    <Suspense fallback={null}>
      <UrlForm />
    </Suspense>
  );
}
