import type { AuditLogView, FindingView, OrganizationView, OrgRole, Severity, UserView } from '../contracts';

/**
 * Response shapes the API documentation describes only loosely. Kept local to the dashboard so
 * the contract the UI relies on is explicit (see docs/WEB_DASHBOARD.md → "API contract").
 */

export interface MeResponse {
  user: UserView;
  organizations: OrganizationView[];
}

export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  errors?: { path?: string | (string | number)[]; message: string }[];
}

/** `GET /api/plans` entry (mirrors `PlanDefinition` in the API plan configuration). */
export interface PlanView {
  key: string;
  name: string;
  description: string;
  monthlyPriceUsd: number | null;
  limits: Record<string, number>;
  features: string[];
}

/** `GET /api/projects/:id/schedules` entry. */
export interface ScheduleView {
  id: string;
  projectSourceId: string;
  intervalHours: number;
  enabled: boolean;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  createdAt?: string;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  minSeverity: Severity;
}

export interface FindingEvidence {
  kind: string;
  content: string;
  startLine: number | null;
}

export interface FindingDetailView extends FindingView {
  evidence?: FindingEvidence[];
  /** Optional extras the API may include for dependency findings. */
  vulnerableRange?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ScanStatusView {
  id: string;
  status: import('../contracts').ScanStatus;
  stage: import('../contracts').ScanStage | null;
  progress: number;
  errorMessage: string | null;
}

export interface ShareResponse {
  url: string;
  expiresAt: string;
}

export interface InvitationCreatedResponse {
  invitation: import('../contracts').InvitationView;
  inviteUrl: string;
}

/** `GET /api/admin/rules` entry. Fields beyond id/enabled are rendered when present. */
export interface AdminRuleView {
  id: string;
  ruleId?: string;
  title?: string;
  name?: string;
  category?: string;
  severity?: Severity;
  engine?: string;
  enabled: boolean;
}

export interface AdminAuditLogView extends AuditLogView {
  organizationId?: string | null;
}

export type ExportFormat = 'json' | 'csv' | 'pdf';

export type { OrgRole };
