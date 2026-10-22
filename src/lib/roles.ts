import type { OrgRole } from '../contracts';

/** Mirrors the role table in docs/API_DOCUMENTATION.md. The API enforces; the UI only hides/disables. */
const RANK: Record<OrgRole, number> = { OWNER: 4, ADMIN: 3, SECURITY_ANALYST: 2, DEVELOPER: 2, VIEWER: 1 };

export type Permission =
  | 'view'
  | 'scan'
  | 'createProject'
  | 'triageFindings'
  | 'manageIntegrations'
  | 'manageSchedules'
  | 'manageProjectSettings'
  | 'deleteScans'
  | 'manageMembers'
  | 'viewAuditLog'
  | 'deleteOrganization'
  | 'changeRetention';

const MIN_RANK: Record<Permission, number> = {
  view: 1,
  scan: 2,
  createProject: 2,
  triageFindings: 2,
  manageIntegrations: 3,
  manageSchedules: 3,
  manageProjectSettings: 3,
  deleteScans: 3,
  manageMembers: 3,
  viewAuditLog: 3,
  deleteOrganization: 4,
  changeRetention: 4,
};

export function can(role: OrgRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return RANK[role] >= MIN_RANK[permission];
}

/** Roles a member with `role` may assign to others (ADMIN cannot grant OWNER). */
export function assignableRoles(role: OrgRole | null | undefined): OrgRole[] {
  if (role === 'OWNER') return ['OWNER', 'ADMIN', 'SECURITY_ANALYST', 'DEVELOPER', 'VIEWER'];
  if (role === 'ADMIN') return ['ADMIN', 'SECURITY_ANALYST', 'DEVELOPER', 'VIEWER'];
  return [];
}

export const ROLE_LABELS: Record<OrgRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  SECURITY_ANALYST: 'Security analyst',
  DEVELOPER: 'Developer',
  VIEWER: 'Viewer',
};
