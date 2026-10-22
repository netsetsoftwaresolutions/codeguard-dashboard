import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { areasNotScanned, CoverageSection, PullRequestHeader, RISK_DISCLAIMER, RiskPanel, ScanSummarySection, StageTimeline } from '@/components/scan-report';
import { scan, summary } from './fixtures';

/** Affirmative "this code is safe" style claims that must never be rendered. */
const SAFE_CLAIM = /\b(code|repository|project|scan) (is|looks) (safe|clean|secure)\b|\bmalware[- ]free\b|\bno malware\b|\bguaranteed\b/i;

function textWithoutDisclaimer(el: HTMLElement): string {
  return (el.textContent ?? '').split(RISK_DISCLAIMER).join(' ');
}

describe('risk & coverage rendering', () => {
  it('shows the explainable-score disclaimer and component breakdown', () => {
    const s = summary({
      totalFindings: 2,
      risk: {
        score: 37,
        level: 'ELEVATED',
        methodologyVersion: 'risk-v1',
        components: [
          { key: 'sev', label: 'High severity findings', points: 30, detail: '1 high finding' },
          { key: 'secrets', label: 'Exposed secrets', points: 7, detail: '1 secret' },
        ],
      },
    });
    render(<RiskPanel summary={s} />);
    expect(screen.getByText(RISK_DISCLAIMER)).toBeTruthy();
    expect(screen.getByText('High severity findings')).toBeTruthy();
    expect(screen.getByText('+30')).toBeTruthy();
    expect(screen.getByText('+7')).toBeTruthy();
  });

  it('lists limitations, engine status and areas not scanned', () => {
    const { container } = render(<CoverageSection summary={summary()} />);
    const lim = screen.getByTestId('limitations');
    expect(within(lim).getByText('Minified files were scanned with reduced accuracy.')).toBeTruthy();
    expect(within(lim).getByText(/runtime behaviour/i)).toBeTruthy();
    const areas = screen.getByTestId('areas-not-scanned');
    expect(within(areas).getByText(/15 files excluded: Vendored/)).toBeTruthy();
    expect(within(areas).getByText(/Engine semgrep not installed — semgrep binary not found/)).toBeTruthy();
    expect(screen.getByText('NOT_INSTALLED')).toBeTruthy();
    expect(screen.getByText(/No lockfile was found/)).toBeTruthy();
    expect(SAFE_CLAIM.test(container.textContent ?? '')).toBe(false);
  });

  it('derives areas not scanned only from data', () => {
    const s = summary();
    s.coverage.excludedByReason = {};
    s.coverage.engines = [{ engine: 'codeguard-rules', status: 'COMPLETED', durationMs: 1, findingCount: 0 }];
    s.coverage.truncated = true;
    expect(areasNotScanned(s)).toEqual(['The file inventory was truncated; remaining files were not scanned.']);
  });

  it('never claims the code is safe when there are zero findings', () => {
    const { container } = render(<ScanSummarySection scan={scan()} summary={summary()} />);
    expect(screen.getByText('No findings reported')).toBeTruthy();
    expect(screen.getByText(/does not prove the absence/)).toBeTruthy();
    expect(SAFE_CLAIM.test(textWithoutDisclaimer(container))).toBe(false);
    // The only appearance of "safe" is inside the disclaimer itself.
    expect(/safe/i.test(textWithoutDisclaimer(container))).toBe(false);
  });

  it('shows a failure notice for failed scans', () => {
    render(<ScanSummarySection scan={scan({ status: 'FAILED', errorMessage: 'Repository not accessible', summary: null })} summary={null} />);
    expect(screen.getByText('Repository not accessible')).toBeTruthy();
  });

  it('renders the PR verdict from introduced findings', () => {
    render(<PullRequestHeader scan={scan({ type: 'PULL_REQUEST', baseRef: 'main', ref: 'feature' })} newCount={3} totalCount={10} />);
    expect(screen.getByTestId('pr-verdict').textContent).toBe('This change introduces 3 new findings relative to the target.');
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('marks the current stage in the timeline', () => {
    const { container } = render(<StageTimeline scan={{ status: 'RUNNING', stage: 'RUNNING_ENGINES', progress: 50, errorMessage: null }} />);
    const current = container.querySelector('[aria-current="step"]');
    expect(current?.textContent).toContain('Running scan engines');
    expect(container.querySelectorAll('li')).toHaveLength(10);
  });
});
