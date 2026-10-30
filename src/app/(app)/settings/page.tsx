'use client';

import { CreateOrganizationSchema } from '../../../contracts';
import { LogOut, Moon, Sun, Trash } from 'lucide-react';
import { useState } from 'react';
import { ORG_STORAGE_KEY, useAuth } from '@/components/auth';
import { useTheme } from '@/components/theme';
import { Button, Card, CardBody, CardHeader, ConfirmDialog, DescriptionList, Field, focusRing, FormError, Input, Notice, PageHeader, Pill } from '@/components/ui';
import { cx } from '@/components/primitives';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/roles';
import { validate } from '@/lib/validation';

export default function SettingsPage() {
  const { user, currentOrg, can, logout, refresh, organizations, setCurrentOrgId } = useAuth();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(currentOrg?.name ?? '');
  const [retention, setRetention] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);
  const [newOrg, setNewOrg] = useState('');
  const [newOrgBusy, setNewOrgBusy] = useState(false);
  const [newOrgError, setNewOrgError] = useState<unknown>(null);
  const isOwner = can('deleteOrganization');

  if (!user || !currentOrg) return null;

  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Profile" />
          <CardBody className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-base font-semibold text-brand-700 dark:text-brand-400" aria-hidden="true">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{user.name ?? user.email}</p>
                <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span className="truncate">{user.email}</span>
                  {user.emailVerified ? <Pill className="bg-green-500/10 text-green-700 dark:text-green-300">verified</Pill> : <Pill>unverified</Pill>}
                </p>
              </div>
            </div>
            <DescriptionList
              items={[
                { label: 'Member since', value: formatDate(user.createdAt) },
                { label: 'Organizations', value: organizations.map((o) => `${o.name} (${ROLE_LABELS[o.role]})`).join(', ') },
              ]}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-ink-600">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-600 dark:text-slate-300">Theme</span>
                <div role="group" aria-label="Theme" className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-ink-900">
                  {(['dark', 'light'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={theme === t}
                      onClick={() => setTheme(t)}
                      className={cx(
                        'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors',
                        focusRing,
                        theme === t ? 'bg-white text-slate-900 shadow-sm dark:bg-ink-600 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                      )}
                    >
                      {t === 'dark' ? <Moon size={14} aria-hidden="true" /> : <Sun size={14} aria-hidden="true" />}
                      {t === 'dark' ? 'Dark' : 'Light'}
                    </button>
                  ))}
                </div>
              </div>
              <Button variant="outline" icon={<LogOut size={16} aria-hidden="true" />} onClick={() => void logout()}>
                Sign out
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Organization" description={isOwner ? undefined : 'Only the organization owner can change these settings.'} />
          <CardBody>
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const body: { name?: string; retentionDays?: number } = {};
                if (name.trim() && name.trim() !== currentOrg.name) {
                  const v = validate(CreateOrganizationSchema, { name });
                  if (!v.ok) return setError(new Error(v.errors.name));
                  body.name = v.data.name;
                }
                if (retention.trim()) {
                  const n = Number(retention);
                  if (!Number.isInteger(n) || n < 1 || n > 3650) return setError(new Error('Retention must be a whole number of days between 1 and 3650.'));
                  body.retentionDays = n;
                }
                if (!Object.keys(body).length) return setError(new Error('Nothing to save.'));
                setBusy(true);
                setError(null);
                setSaved(false);
                try {
                  await api.organizations.update(currentOrg.id, body);
                  await refresh();
                  setSaved(true);
                  setRetention('');
                } catch (err) {
                  setError(err);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <fieldset disabled={!isOwner} className="grid items-start gap-4 disabled:opacity-70 sm:grid-cols-2">
                <Field htmlFor="org-name" label="Organization name">
                  <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
                </Field>
                <Field htmlFor="retention" label="Data retention (days)" hint="Scans, reports and uploaded code older than this are deleted automatically. Leave empty to keep the current value; your plan may cap it.">
                  <Input id="retention" type="number" min={1} max={3650} value={retention} onChange={(e) => setRetention(e.target.value)} placeholder="unchanged" />
                </Field>
              </fieldset>
              <FormError error={error} />
              {saved && <Notice tone="success">Organization updated.</Notice>}
              {isOwner && (
                <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-ink-600">
                  <Button type="submit" loading={busy}>
                    Save organization
                  </Button>
                </div>
              )}
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Create another organization" description="Start a separate workspace with its own projects and members." />
          <CardBody>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const v = validate(CreateOrganizationSchema, { name: newOrg });
                if (!v.ok) return setNewOrgError(new Error(v.errors.name));
                setNewOrgBusy(true);
                setNewOrgError(null);
                try {
                  const o = await api.organizations.create(v.data.name);
                  await refresh();
                  setCurrentOrgId(o.id);
                  setNewOrg('');
                } catch (err) {
                  setNewOrgError(err);
                } finally {
                  setNewOrgBusy(false);
                }
              }}
            >
              <div className="min-w-[240px] flex-1">
                <Field htmlFor="new-org" label="Organization name">
                  <Input id="new-org" placeholder="e.g. Acme Security" value={newOrg} onChange={(e) => setNewOrg(e.target.value)} maxLength={100} />
                </Field>
              </div>
              <Button type="submit" variant="outline" loading={newOrgBusy}>
                Create
              </Button>
            </form>
            <div className="mt-3">
              <FormError error={newOrgError} />
            </div>
          </CardBody>
        </Card>

        <Card className="border-red-500/40 dark:border-red-500/40">
          <CardHeader title={<span className="text-red-600 dark:text-red-400">Danger zone</span>} />
          <CardBody className="space-y-5 text-sm">
            <div>
              <h3 className="font-semibold">Delete my uploaded code and reports</h3>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Uploaded code is kept only to produce reports and is removed according to the retention period above. To delete it sooner, delete the
                individual scan (scan report → Delete) or the whole project (project → Settings → Delete project); both permanently remove findings,
                reports and stored uploads. Deleting the organization removes everything below.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-ink-600">
              <div>
                <h3 className="font-semibold">Delete organization</h3>
                <p className="text-slate-600 dark:text-slate-300">Permanently deletes {currentOrg.name}, all projects, scans, findings, uploads and memberships.</p>
              </div>
              <Button
                variant="outline"
                className="!border-red-500/50 !text-red-600 hover:!bg-red-500/10 dark:!text-red-400"
                disabled={!isOwner}
                onClick={() => setDeleting(true)}
                icon={<Trash size={16} aria-hidden="true" />}
              >
                Delete organization
              </Button>
            </div>
            {!isOwner && <p className="text-xs text-slate-500">Only the owner can delete the organization.</p>}
          </CardBody>
        </Card>
      </div>
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete organization"
        description="This cannot be undone. All data belonging to this organization will be permanently deleted."
        confirmText={currentOrg.name}
        confirmLabel="Delete organization"
        busy={deleteBusy}
        error={deleteError}
        onConfirm={async () => {
          setDeleteBusy(true);
          setDeleteError(null);
          try {
            await api.organizations.remove(currentOrg.id);
            try {
              localStorage.removeItem(ORG_STORAGE_KEY);
            } catch {
              /* ignore */
            }
            window.location.assign('/dashboard');
          } catch (err) {
            setDeleteError(err);
            setDeleteBusy(false);
          }
        }}
      />
    </>
  );
}
