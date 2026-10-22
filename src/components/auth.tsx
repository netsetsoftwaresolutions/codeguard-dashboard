'use client';

import type { OrganizationView, OrgRole, UserView } from '../contracts';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';
import { can, type Permission } from '@/lib/roles';

export const ORG_STORAGE_KEY = 'codeguard.organizationId';

export interface AuthCtx {
  user: UserView | null;
  organizations: OrganizationView[];
  currentOrg: OrganizationView | null;
  role: OrgRole | null;
  loading: boolean;
  error: string | null;
  setCurrentOrgId: (id: string) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  can: (p: Permission) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

function readStoredOrg(): string | null {
  try {
    return window.localStorage.getItem(ORG_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Picks the stored organization if the user still belongs to it, otherwise the first one. */
export function selectOrganization(orgs: OrganizationView[], storedId: string | null): OrganizationView | null {
  if (!orgs.length) return null;
  return orgs.find((o) => o.id === storedId) ?? orgs[0];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserView | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationView[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const me = await api.auth.me();
      setUser(me.user);
      setOrganizations(me.organizations);
      const sel = selectOrganization(me.organizations, readStoredOrg());
      setOrgId(sel?.id ?? null);
      setError(null);
    } catch (e) {
      // 401 already triggered a redirect to /login inside the API client.
      if (!(e instanceof ApiError && e.status === 401)) setError(e instanceof Error ? e.message : 'Unable to load your session.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setCurrentOrgId = useCallback((id: string) => {
    setOrgId(id);
    try {
      window.localStorage.setItem(ORG_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      try {
        window.localStorage.removeItem(ORG_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      window.location.assign('/login');
    }
  }, []);

  const currentOrg = useMemo(() => organizations.find((o) => o.id === orgId) ?? null, [organizations, orgId]);
  const role = currentOrg?.role ?? null;

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      organizations,
      currentOrg,
      role,
      loading,
      error,
      setCurrentOrgId,
      refresh,
      logout,
      can: (p: Permission) => can(role, p),
    }),
    [user, organizations, currentOrg, role, loading, error, setCurrentOrgId, refresh, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}

/** Convenience for pages: the current organization id (null until loaded). */
export function useOrgId(): string | null {
  return useAuth().currentOrg?.id ?? null;
}
