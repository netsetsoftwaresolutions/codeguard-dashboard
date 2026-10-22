'use client';

import { GitBranch } from 'lucide-react';
import { useMeta } from '@/components/meta';
import { api } from '@/lib/api';
import { buttonClass } from '@/components/ui';

/** Rendered only when the server has GitHub OAuth login configured (MetaView.features.githubOAuthLogin). */
export function GithubLoginButton() {
  const { meta } = useMeta();
  if (!meta?.features.githubOAuthLogin) return null;
  return (
    <>
      <a href={api.auth.githubStartUrl()} className={buttonClass('outline', 'lg', 'w-full')}>
        <GitBranch size={16} aria-hidden="true" />
        Continue with GitHub
      </a>
      <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200 dark:bg-ink-600" />
        or
        <span className="h-px flex-1 bg-slate-200 dark:bg-ink-600" />
      </div>
    </>
  );
}
