'use client';

import type { MemberView, OrgRole } from '../../../contracts';
import { InviteMemberSchema } from '../../../contracts';
import { EmptyState, formatRelativeTime } from '../../../components/primitives';
import { Trash, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/components/auth';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  CopyButton,
  ErrorState,
  Field,
  FormError,
  Input,
  LoadingBlock,
  Modal,
  Notice,
  PageHeader,
  Pagination,
  Pill,
  Select,
  Table,
  tbodyClass,
  Td,
  Th,
} from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import { assignableRoles, ROLE_LABELS } from '@/lib/roles';
import { validate } from '@/lib/validation';

const actionLabel = (a: string) => {
  const t = a.replace(/[._]/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function Members({ orgId }: { orgId: string }) {
  const { role, can, user } = useAuth();
  const canManage = can('manageMembers');
  const { data, error, loading, reload, setData } = useApi(`members:${orgId}`, () => api.organizations.members(orgId));
  const [actionError, setActionError] = useState<unknown>(null);
  const [removing, setRemoving] = useState<MemberView | null>(null);
  const [busy, setBusy] = useState(false);
  const roles = assignableRoles(role);
  return (
    <Card>
      <CardHeader title="Members" description={data ? `${data.length} ${data.length === 1 ? 'person' : 'people'} with access` : undefined} />
      <FormError error={actionError} />
      {error ? (
        <CardBody>
          <ErrorState error={error} onRetry={reload} />
        </CardBody>
      ) : loading && !data ? (
        <CardBody>
          <LoadingBlock rows={3} />
        </CardBody>
      ) : (
        <ul aria-label="Organization members" className={tbodyClass}>
          {(data ?? []).map((m) => {
            const self = m.userId === user?.id;
            const editable = canManage && !self && (role === 'OWNER' || m.role !== 'OWNER');
            return (
              <li key={m.id} className="grid items-center gap-x-4 gap-y-2 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_11rem_7.5rem_6.5rem]">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-xs font-semibold text-brand-700 dark:text-brand-400" aria-hidden="true">
                    {(m.name ?? m.email).charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                      <span className="truncate">{m.name ?? m.email}</span>
                      {self && <Pill>you</Pill>}
                    </p>
                    {m.name && <p className="truncate text-xs text-slate-500">{m.email}</p>}
                  </div>
                </div>
                <div>
                  {editable ? (
                    <Select
                      aria-label={`Role for ${m.email}`}
                      value={m.role}
                      className="w-full"
                      onChange={async (e) => {
                        const r = e.target.value as OrgRole;
                        setActionError(null);
                        try {
                          await api.organizations.updateMember(orgId, m.id, r);
                          setData((prev) => prev?.map((x) => (x.id === m.id ? { ...x, role: r } : x)));
                        } catch (err) {
                          setActionError(err);
                        }
                      }}
                    >
                      {(roles.includes(m.role) ? roles : [m.role, ...roles]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Pill className={m.role === 'OWNER' ? 'bg-brand-600/10 text-brand-700 dark:text-brand-400' : undefined}>{ROLE_LABELS[m.role]}</Pill>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Joined {formatDate(m.createdAt)}</p>
                <div className="sm:text-right">
                  {editable && (
                    <Button size="sm" variant="ghost" icon={<Trash size={14} aria-hidden="true" />} onClick={() => setRemoving(m)}>
                      Remove
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Remove member"
        description={`${removing?.email ?? ''} will lose access to this organization immediately.`}
        confirmLabel="Remove"
        busy={busy}
        onConfirm={async () => {
          if (!removing) return;
          setBusy(true);
          try {
            await api.organizations.removeMember(orgId, removing.id);
            setData((prev) => prev?.filter((x) => x.id !== removing.id));
          } catch (err) {
            setActionError(err);
          } finally {
            setBusy(false);
            setRemoving(null);
          }
        }}
      />
    </Card>
  );
}

function Invitations({ orgId }: { orgId: string }) {
  const { can, role } = useAuth();
  const { data, error, loading, reload } = useApi(`invitations:${orgId}`, () => api.organizations.invitations(orgId));
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState<Exclude<OrgRole, 'OWNER'>>('DEVELOPER');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<unknown>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const roles = assignableRoles(role).filter((r): r is Exclude<OrgRole, 'OWNER'> => r !== 'OWNER');
  if (!can('manageMembers')) return null;
  return (
    <Card>
      <CardHeader title="Invite a teammate" description="Send an invitation by email and choose their role." icon={<UserPlus size={16} aria-hidden="true" />} />
      <CardBody className="space-y-4">
        <form
          className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            const v = validate(InviteMemberSchema, { email, role: newRole });
            if (!v.ok) return setFormError(new Error(Object.values(v.errors)[0]));
            setBusy(true);
            setFormError(null);
            try {
              const r = await api.organizations.invite(orgId, v.data.email, v.data.role);
              setInviteUrl(r.inviteUrl);
              setEmail('');
              reload();
            } catch (err) {
              setFormError(err);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field htmlFor="invite-email" label="Email">
            <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field htmlFor="invite-role" label="Role">
            <Select id="invite-role" value={newRole} onChange={(e) => setNewRole(e.target.value as Exclude<OrgRole, 'OWNER'>)}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" loading={busy}>
            Send invitation
          </Button>
        </form>
        <FormError error={formError} />
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !data ? (
          <LoadingBlock rows={2} />
        ) : data && data.filter((i) => !i.acceptedAt).length ? (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-ink-700 dark:border-ink-600">
            {data
              .filter((i) => !i.acceptedAt)
              .map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                  <span>
                    {i.email} <Pill>{ROLE_LABELS[i.role]}</Pill>{' '}
                    <span className="text-xs text-slate-500">expires {formatDateTime(i.expiresAt)}</span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await api.organizations.revokeInvitation(orgId, i.id);
                        reload();
                      } catch (err) {
                        setFormError(err);
                      }
                    }}
                  >
                    Revoke
                  </Button>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">No pending invitations.</p>
        )}
      </CardBody>
      <Modal open={!!inviteUrl} onClose={() => setInviteUrl(null)} title="Invitation created" footer={<Button onClick={() => setInviteUrl(null)}>Done</Button>}>
        <div className="space-y-3 text-sm">
          <Notice tone="warning">This link is shown only once. Copy it now and send it to the invitee.</Notice>
          <p className="break-all rounded-lg bg-slate-100 p-2 font-mono text-xs dark:bg-ink-900">{inviteUrl}</p>
          {inviteUrl && <CopyButton value={inviteUrl} label="Copy invite link" />}
        </div>
      </Modal>
    </Card>
  );
}

function AuditLog({ orgId }: { orgId: string }) {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const enabled = can('viewAuditLog');
  const { data, error, loading, reload } = useApi(enabled ? `audit:${orgId}:${page}` : null, () => api.organizations.auditLogs(orgId, page));
  if (!enabled) return null;
  return (
    <Card>
      <CardHeader title="Audit log" />
      {error ? (
        <CardBody>
          <ErrorState error={error} onRetry={reload} />
        </CardBody>
      ) : loading && !data ? (
        <CardBody>
          <LoadingBlock rows={4} />
        </CardBody>
      ) : data && data.items.length ? (
        <>
          <Table caption="Organization audit log">
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Resource</Th>
              </tr>
            </thead>
            <tbody className={tbodyClass}>
              {data.items.map((a) => (
                <tr key={a.id}>
                  <Td className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                    <time dateTime={a.createdAt} title={formatDateTime(a.createdAt)}>
                      {formatRelativeTime(a.createdAt)}
                    </time>
                  </Td>
                  <Td className="text-xs">{a.actorEmail ?? 'system'}</Td>
                  <Td className="text-xs font-medium" ><span title={a.action}>{actionLabel(a.action)}</span></Td>
                  <Td className="text-xs">
                    <span className="capitalize">{a.resourceType}</span>
                    {a.resourceId && (
                      <span className="ml-1.5 font-mono text-slate-500" title={a.resourceId}>
                        …{a.resourceId.slice(-6)}
                      </span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </>
      ) : (
        <CardBody>
          <EmptyState title="No audit events" />
        </CardBody>
      )}
    </Card>
  );
}

export default function TeamPage() {
  const { currentOrg } = useAuth();
  if (!currentOrg) return <LoadingBlock />;
  return (
    <>
      <PageHeader title="Team" description={`Members and access for ${currentOrg.name}.`} />
      <div className="space-y-6">
        <Members orgId={currentOrg.id} />
        <Invitations orgId={currentOrg.id} />
        <AuditLog orgId={currentOrg.id} />
      </div>
    </>
  );
}
