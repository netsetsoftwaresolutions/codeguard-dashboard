'use client';

import { PasswordResetRequestSchema } from '../../../contracts';
import Link from 'next/link';
import { useState } from 'react';
import { Button, Field, FormError, Input, Notice } from '@/components/ui';
import { api } from '@/lib/api';
import { validate } from '@/lib/validation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <>
      <h1 className="text-xl font-semibold">Reset your password</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">We will email you a link to choose a new password.</p>
      {sent ? (
        <div className="mt-6 space-y-4">
          <Notice tone="success" title="Check your inbox">
            If an account exists for that address, a reset link has been sent. The link expires after a short time.
          </Notice>
          <Link href="/login" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form
          noValidate
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const v = validate(PasswordResetRequestSchema, { email });
            if (!v.ok) {
              setFieldError(v.errors.email);
              return;
            }
            setFieldError(undefined);
            setBusy(true);
            setError(null);
            try {
              await api.auth.requestPasswordReset(v.data.email);
              setSent(true);
            } catch (err) {
              setError(err);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field htmlFor="email" label="Email" error={fieldError}>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!fieldError} />
          </Field>
          <FormError error={error} />
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Send reset link
          </Button>
          <p className="text-center text-sm">
            <Link href="/login" className="text-brand-600 hover:underline dark:text-brand-400">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </>
  );
}
