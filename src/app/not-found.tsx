import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
        The page does not exist, or the resource is not visible to your account.
      </p>
      <Link href="/dashboard" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
        Go to dashboard
      </Link>
    </main>
  );
}
