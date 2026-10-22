'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/components/auth';
import { Notice, PageHeader, Tabs } from '@/components/ui';

export default function NewScanLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const { can, currentOrg } = useAuth();
  const active = pathname.endsWith('/url') ? 'url' : pathname.endsWith('/repository') ? 'repository' : pathname.endsWith('/upload') ? 'upload' : '';
  return (
    <>
      <PageHeader title="New scan" description="Choose how to provide the code. Every scan produces a report with findings, coverage and limitations." />
      <Tabs
        label="Scan source"
        active={active}
        items={[
          { key: 'upload', label: 'Upload code', href: '/scans/new/upload' },
          { key: 'url', label: 'Scan URL', href: '/scans/new/url' },
          { key: 'repository', label: 'Scan repository', href: '/scans/new/repository' },
        ]}
      />
      {can('scan') ? children : <Notice tone="warning">Your role ({currentOrg?.role ?? 'unknown'}) can view reports but cannot start scans.</Notice>}
    </>
  );
}
