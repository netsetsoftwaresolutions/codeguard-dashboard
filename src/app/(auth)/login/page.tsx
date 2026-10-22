'use client';

import { LoginSchema } from '../../../contracts';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Button, Field, FormError, Input } from '@/components/ui';
import { api } from '@/lib/api';
import { safeNextPath, validate, type FieldErrors } from '@/lib/validation';
import { GithubLoginButton } from '../github-button';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const oauthError = params.get('error');

  return (
    <>
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        No account?{' '}
        <Link href={`/register${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Create one
        </Link>
      </p>
      <div className="mt-6">
        <GithubLoginButton />
        {oauthError && <FormError error={new Error('Sign-in with the external provider failed. Please try again.')} />}
        <form
          noValidate
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const v = validate(LoginSchema, { email, password });
            if (!v.ok) {
              setFieldErrors(v.errors);
              return;
            }
            setFieldErrors({});
            setBusy(true);
            setError(null);
            try {
              await api.auth.login(v.data);
              router.replace(next);
            } catch (err) {
              setError(err);
              setBusy(false);
            }
          }}
        >
          <Field htmlFor="email" label="Email" error={fieldErrors.email}>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!fieldErrors.email} required />
          </Field>
          <Field htmlFor="password" label="Password" error={fieldErrors.password}>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!fieldErrors.password} required />
          </Field>
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
              Forgot password?
            </Link>
          </div>
          <FormError error={error} />
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Sign in
          </Button>
        </form>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
