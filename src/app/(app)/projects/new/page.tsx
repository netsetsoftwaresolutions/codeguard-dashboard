'use client';

import { CreateProjectSchema } from '../../../../contracts';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/auth';
import { Button, Card, CardBody, Field, FormError, Input, Notice, PageHeader, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { validate, type FieldErrors } from '@/lib/validation';

export default function NewProjectPage() {
  const router = useRouter();
  const { currentOrg, can } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <PageHeader title="New project" breadcrumb={[{ href: '/projects', label: 'Projects' }]} />
      <Card className="max-w-2xl">
        <CardBody>
          {!can('createProject') ? (
            <Notice tone="warning">Your role ({currentOrg?.role}) cannot create projects. Ask an organization admin.</Notice>
          ) : (
            <form
              noValidate
              className="space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!currentOrg) return;
                const v = validate(CreateProjectSchema, { organizationId: currentOrg.id, name, description: description.trim() || undefined });
                if (!v.ok) {
                  setFieldErrors(v.errors);
                  return;
                }
                setFieldErrors({});
                setBusy(true);
                setError(null);
                try {
                  const p = await api.projects.create(v.data);
                  router.push(`/projects/${p.id}`);
                } catch (err) {
                  setError(err);
                  setBusy(false);
                }
              }}
            >
              <Field htmlFor="name" label="Project name" error={fieldErrors.name} required>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} invalid={!!fieldErrors.name} />
              </Field>
              <Field htmlFor="description" label="Description" error={fieldErrors.description}>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
              </Field>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sources (uploads, repositories, links) are attached when you run the first scan for this project.
              </p>
              <FormError error={error} />
              <div className="flex gap-2">
                <Button type="submit" loading={busy}>
                  Create project
                </Button>
                <Button variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardBody>
      </Card>
    </>
  );
}
