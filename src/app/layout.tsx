import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { MetaProvider } from '@/components/meta';
import { THEME_INIT_SCRIPT, ThemeProvider } from '@/components/theme';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'CodeGuard — source code security scanning', template: '%s · CodeGuard' },
  description:
    'Scan source code for malware indicators, vulnerable dependencies, exposed secrets and risky configuration — from uploads, URLs, repositories and pull requests.',
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0B1020' },
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Applies the persisted theme before first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans" suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <MetaProvider>{children}</MetaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
