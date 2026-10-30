'use client';

import { NotificationPreferencesSchema, SEVERITIES, type Severity } from '../../../contracts';
import { EmptyState, formatRelativeTime, SeverityBadge, SEVERITY_STYLES, cx } from '../../../components/primitives';
import { Bell, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Card, CardBody, CardHeader, Checkbox, ErrorState, Field, FormError, LoadingBlock, Notice, PageHeader, Select } from '@/components/ui';
import { api } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import type { NotificationPreferences } from '@/lib/types';
import { validate } from '@/lib/validation';

function Preferences() {
  const { data, error, loading, reload } = useApi('notification-prefs', () => api.notifications.preferences());
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (data) setPrefs(data);
  }, [data]);
  return (
    <Card>
      <CardHeader title="Preferences" />
      <CardBody>
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading || !prefs ? (
          <LoadingBlock rows={3} />
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const v = validate(NotificationPreferencesSchema, prefs);
              if (!v.ok) return setSaveError(new Error(Object.values(v.errors)[0]));
              setBusy(true);
              setSaveError(null);
              setSaved(false);
              try {
                setPrefs(await api.notifications.savePreferences(v.data));
                setSaved(true);
              } catch (err) {
                setSaveError(err);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Checkbox checked={prefs.inAppEnabled} onChange={(v) => setPrefs({ ...prefs, inAppEnabled: v })} label="In-app notifications" />
            <Checkbox
              checked={prefs.emailEnabled}
              onChange={(v) => setPrefs({ ...prefs, emailEnabled: v })}
              label="Email notifications"
              description="Delivered only if email (SMTP) is configured on this server."
            />
            <Field htmlFor="min-sev" label="Minimum severity" hint="Notify about scans with findings at or above this severity.">
              <Select id="min-sev" value={prefs.minSeverity} onChange={(e) => setPrefs({ ...prefs, minSeverity: e.target.value as Severity })}>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_STYLES[s].label}
                  </option>
                ))}
              </Select>
            </Field>
            <FormError error={saveError} />
            {saved && <Notice tone="success">Preferences saved.</Notice>}
            <Button type="submit" loading={busy}>
              Save preferences
            </Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

export default function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, error, loading, reload, setData } = useApi(`notifications:${unreadOnly}`, () => api.notifications.list(unreadOnly));
  const [actionError, setActionError] = useState<unknown>(null);
  const unread = (data ?? []).filter((n) => !n.readAt).length;
  const markRead = async (id: string) => {
    try {
      await api.notifications.markRead(id);
      setData((prev) => prev?.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    } catch (e) {
      setActionError(e);
    }
  };
  return (
    <>
      <PageHeader
        title="Notifications"
        actions={
          <Button
            variant="secondary"
            disabled={!unread}
            icon={<CheckCheck size={16} aria-hidden="true" />}
            onClick={async () => {
              try {
                await api.notifications.markAllRead();
                reload();
              } catch (e) {
                setActionError(e);
              }
            }}
          >
            Mark all as read
          </Button>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader
            title={`${unread} unread`}
            action={<Checkbox checked={unreadOnly} onChange={setUnreadOnly} label="Unread only" />}
          />
          <FormError error={actionError} />
          {error ? (
            <CardBody>
              <ErrorState error={error} onRetry={reload} />
            </CardBody>
          ) : loading && !data ? (
            <CardBody>
              <LoadingBlock rows={5} />
            </CardBody>
          ) : data && data.length ? (
            <ul className="divide-y divide-slate-100 dark:divide-ink-700">
              {data.map((n) => (
                <li key={n.id} className={cx('flex gap-3 px-5 py-4', !n.readAt && 'bg-brand-500/5')}>
                  <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-brand-600')} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {n.severity && <SeverityBadge severity={n.severity} />}
                      <p className="font-medium">
                        {n.link && n.link.startsWith('/') && !n.link.startsWith('//') && !n.link.startsWith('/\\') ? (
                          <Link href={n.link} className="hover:underline" onClick={() => !n.readAt && void markRead(n.id)}>
                            {n.title}
                          </Link>
                        ) : (
                          n.title
                        )}
                      </p>
                      {!n.readAt && <span className="sr-only">(unread)</span>}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{n.body}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                  {!n.readAt && (
                    <Button size="sm" variant="ghost" onClick={() => void markRead(n.id)}>
                      Mark read
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <CardBody>
              <EmptyState icon={<Bell size={28} aria-hidden="true" />} title={unreadOnly ? 'No unread notifications' : 'No notifications yet'} />
            </CardBody>
          )}
        </Card>
        <Preferences />
      </div>
    </>
  );
}
