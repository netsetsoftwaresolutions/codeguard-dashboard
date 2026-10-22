'use client';

import { RegisterSchema } from '../../../contracts';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type ChangeEvent } from 'react';
import { Button, Field, FormError, Input } from '@/components/ui';
import { api } from '@/lib/api';
import { safeNextPath, validate, type FieldErrors } from '@/lib/validation';
import { GithubLoginButton } from '../github-button';

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const [form, setForm] = useState({ name: '', email: '', password: '', organizationName: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <h1 className="text-xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Already registered?{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Sign in
        </Link>
      </p>
      <div className="mt-6">
        <GithubLoginButton />
        <form
          noValidate
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const v = validate(RegisterSchema, {
              email: form.email,
              password: form.password,
              name: form.name.trim() || undefined,
              organizationName: form.organizationName.trim() || undefined,
            });
            if (!v.ok) {
              setFieldErrors(v.errors);
              return;
            }
            setFieldErrors({});
            setBusy(true);
            setError(null);
            try {
              await api.auth.register(v.data);
              router.replace(next);
            } catch (err) {
              setError(err);
              setBusy(false);
            }
          }}
        >
          <Field htmlFor="name" label="Name" error={fieldErrors.name}>
            <Input id="name" autoComplete="name" value={form.name} onChange={set('name')} maxLength={100} />
          </Field>
          <Field htmlFor="email" label="Work email" error={fieldErrors.email} required>
            <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} invalid={!!fieldErrors.email} required />
          </Field>
          <Field htmlFor="password" label="Password" error={fieldErrors.password} hint="At least 10 characters, with letters and numbers." required>
            <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} invalid={!!fieldErrors.password} required />
          </Field>
          <Field htmlFor="organizationName" label="Organization name" error={fieldErrors.organizationName} hint="Optional. A personal organization is created for you.">
            <Input id="organizationName" value={form.organizationName} onChange={set('organizationName')} maxLength={100} />
          </Field>
          <FormError error={error} />
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Create account
          </Button>
        </form>
      </div>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
