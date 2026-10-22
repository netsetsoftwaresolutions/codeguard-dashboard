'use client';

import { PasswordResetConfirmSchema } from '../../../contracts';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Button, Field, FormError, Input, Notice } from '@/components/ui';
import { api } from '@/lib/api';
import { validate, type FieldErrors } from '@/lib/validation';

function ResetForm() {
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <Notice tone="warning" title="Missing reset token">
        Open the link from the password reset email, or{' '}
        <Link href="/forgot-password" className="underline">
          request a new one
        </Link>
        .
      </Notice>
    );
  }
  if (done) {
    return (
      <div className="space-y-4">
        <Notice tone="success" title="Password updated">
          All existing sessions were signed out. Sign in with your new password.
        </Notice>
        <Link href="/login" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
          Go to sign in
        </Link>
      </div>
    );
  }
  return (
    <form
      noValidate
      className="mt-6 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const v = validate(PasswordResetConfirmSchema, { token, password });
        const errs: FieldErrors = v.ok ? {} : v.errors;
        if (password !== confirm) errs.confirm = 'Passwords do not match';
        if (!v.ok || errs.confirm) {
          setFieldErrors(errs);
          return;
        }
        setFieldErrors({});
        setBusy(true);
        setError(null);
        try {
          await api.auth.confirmPasswordReset(v.data.token, v.data.password);
          setDone(true);
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      {fieldErrors.token && <Notice tone="danger">This reset link is malformed. Request a new one.</Notice>}
      <Field htmlFor="password" label="New password" error={fieldErrors.password} hint="At least 10 characters, with letters and numbers.">
        <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!fieldErrors.password} />
      </Field>
      <Field htmlFor="confirm" label="Confirm new password" error={fieldErrors.confirm}>
        <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} invalid={!!fieldErrors.confirm} />
      </Field>
      <FormError error={error} />
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        Set new password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Choose a new password</h1>
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </>
  );
}
