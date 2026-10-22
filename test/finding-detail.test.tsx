import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FindingDetail } from '@/components/finding-detail';
import { finding } from './fixtures';

describe('FindingDetail', () => {
  it('says no fixed version is published instead of inventing one', () => {
    render(<FindingDetail finding={finding({ fixedVersions: [] })} aiAvailable={false} canTriage={false} />);
    const cell = screen.getByTestId('fixed-versions');
    expect(cell.textContent).toBe('No fixed version published');
    expect(/\d+\.\d+/.test(cell.textContent ?? '')).toBe(false);
  });

  it('renders exactly the fixed versions present in the data', () => {
    render(<FindingDetail finding={finding({ fixedVersions: ['4.17.21'] })} aiAvailable={false} canTriage={false} />);
    expect(screen.getByTestId('fixed-versions').textContent).toBe('4.17.21');
  });

  it('links advisories to OSV and drops unsafe reference URLs', () => {
    const { container } = render(<FindingDetail finding={finding()} aiAvailable={false} canTriage={false} />);
    const osv = screen.getByText('GHSA-p6mc-m468-83gw').closest('a');
    expect(osv?.getAttribute('href')).toBe('https://osv.dev/vulnerability/GHSA-p6mc-m468-83gw');
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.some((h) => h.startsWith('javascript:'))).toBe(false);
    expect(screen.getByText('javascript:alert(1)').tagName).toBe('LI');
  });

  it('renders masked evidence and highlights the finding lines', () => {
    const { container } = render(
      <FindingDetail
        finding={{ ...finding({ startLine: 11, endLine: 11 }), evidence: [{ kind: 'snippet', content: 'a\nconst key = "AKIA****"\nc', startLine: 10 }] }}
        aiAvailable={false}
        canTriage={false}
      />,
    );
    const hl = container.querySelectorAll('[data-highlighted="true"]');
    expect(hl).toHaveLength(1);
    expect(hl[0].textContent).toContain('AKIA****');
  });

  it('offers AI explanation only when configured and never for secrets', () => {
    const { rerender } = render(<FindingDetail finding={finding()} aiAvailable canTriage={false} />);
    expect(screen.getByRole('button', { name: /Generate AI explanation/ })).toBeTruthy();
    expect(screen.getByText('AI explanation — verify before acting')).toBeTruthy();
    rerender(<FindingDetail key="secret" finding={finding({ category: 'SECRET', advisoryIds: [], packageName: null })} aiAvailable canTriage={false} />);
    expect(screen.queryByRole('button', { name: /Generate AI explanation/ })).toBeNull();
    rerender(<FindingDetail key="noai" finding={finding()} aiAvailable={false} canTriage={false} />);
    expect(screen.queryByRole('button', { name: /Generate AI explanation/ })).toBeNull();
  });

  it('hides triage controls for roles that cannot triage', () => {
    const { rerender } = render(<FindingDetail finding={finding()} aiAvailable={false} canTriage={false} />);
    expect(screen.queryByLabelText('Status')).toBeNull();
    rerender(<FindingDetail finding={finding()} aiAvailable={false} canTriage />);
    expect(screen.getByLabelText('Status')).toBeTruthy();
    expect(screen.getByLabelText('Apply to future scans')).toBeTruthy();
  });
});
