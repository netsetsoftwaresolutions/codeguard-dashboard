import { GitBranch, Link2, Upload } from 'lucide-react';
import Link from 'next/link';

const OPTIONS = [
  {
    href: '/scans/new/upload',
    icon: Upload,
    title: 'Upload code',
    body: 'Individual files, a whole folder, or a single ZIP / TAR / TGZ archive from your computer.',
  },
  {
    href: '/scans/new/url',
    icon: Link2,
    title: 'Scan a URL',
    body: 'Any supported link: repository, file, pull request, Dropbox or Google Drive share, raw file or archive.',
  },
  {
    href: '/scans/new/repository',
    icon: GitBranch,
    title: 'Scan a repository',
    body: 'GitHub, GitLab or Bitbucket: pick a ref, several branches or all branches, include commit history, or analyse a pull request.',
  },
];

export default function NewScanHub() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {OPTIONS.map(({ href, icon: Icon, title, body }) => (
        <Link
          key={href}
          href={href}
          className="group rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-brand-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-ink-600 dark:bg-ink-800"
        >
          <Icon size={22} className="text-brand-600 dark:text-brand-400" aria-hidden="true" />
          <h2 className="mt-4 font-semibold group-hover:text-brand-700 dark:group-hover:text-brand-400">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{body}</p>
        </Link>
      ))}
    </div>
  );
}
