import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import LandingPage from '@/app/page';
import { api, ApiError } from '@/lib/api';

it('replaces failed plans with an error and allows a successful retry', async () => {
  vi.spyOn(api.auth, 'me').mockRejectedValue(new ApiError(401, 'Unauthorized'));
  const plans = vi.spyOn(api, 'plans')
    .mockRejectedValueOnce(new ApiError(0, 'Request timed out. Try again.'))
    .mockResolvedValueOnce([]);
  render(<LandingPage />);
  expect(screen.getByRole('status', { name: 'Loading plans' })).toBeTruthy();
  expect(await screen.findByText('Request timed out. Try again.')).toBeTruthy();
  expect(screen.queryByRole('status', { name: 'Loading plans' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(screen.getByRole('status', { name: 'Loading plans' })).toBeTruthy();
  expect(await screen.findByText('No plans are published on this server.')).toBeTruthy();
  expect(plans).toHaveBeenCalledTimes(2);
});
