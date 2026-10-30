import { renderHook, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useApi } from '@/lib/hooks';

it('clears the previous data as soon as the key changes', async () => {
  const { result, rerender } = renderHook(({ k }) => useApi(k, () => Promise.resolve(k)), { initialProps: { k: 'a' } });
  await waitFor(() => expect(result.current.data).toBe('a'));
  rerender({ k: 'b' });
  expect(result.current.data).toBeUndefined();
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.data).toBe('b'));
});
