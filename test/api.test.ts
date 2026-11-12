import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, apiRequest, buildUrl, CSRF_HEADER, parseErrorBody } from '@/lib/api';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('api client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const assign = vi.fn();

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    assign.mockReset();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, pathname: '/projects/abc', search: '?tab=history', origin: 'http://localhost', assign },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('times out stalled requests after 10 seconds', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }));
    const result = expect(api.plans()).rejects.toMatchObject({ status: 0, message: 'Request timed out. Try again.' });
    await vi.advanceTimersByTimeAsync(9_999);
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([200, 500])('keeps the timeout active while reading a %s response body', async (status) => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, { signal }) => {
      const stalledBody = () => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
      return Promise.resolve({ ok: status === 200, status, headers: new Headers({ 'content-type': 'application/json' }), text: stalledBody, json: stalledBody });
    });
    const result = expect(apiRequest('/plans', { timeoutMs: 25 })).rejects.toMatchObject({ message: 'Request timed out. Try again.' });
    await vi.advanceTimersByTimeAsync(25);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([false, true])('preserves caller cancellation (already aborted: %s)', async (alreadyAborted) => {
    vi.useFakeTimers();
    const controller = new AbortController();
    fetchMock.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
      if (signal.aborted) reject(signal.reason);
      else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }));
    if (alreadyAborted) controller.abort();
    const result = expect(apiRequest('/plans', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    if (!alreadyAborted) controller.abort();
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the timeout after a successful response', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(jsonResponse(200, []));
    await expect(api.plans()).resolves.toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not send the CSRF header on GET and includes credentials', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));
    await api.projects.list('org1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/projects?organizationId=org1');
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('include');
    expect(init.headers[CSRF_HEADER]).toBeUndefined();
  });

  it.each([
    ['POST', () => api.scans.cancel('s1')],
    ['PATCH', () => api.findings.updateStatus('f1', { status: 'RESOLVED', applyToFuture: false })],
    ['PUT', () => api.notifications.savePreferences({ emailEnabled: true, inAppEnabled: true, minSeverity: 'HIGH' })],
    ['DELETE', () => api.scans.remove('s1')],
  ])('sends X-CodeGuard-CSRF: 1 on %s', async (method, call) => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await call();
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe(method);
    expect(init.headers[CSRF_HEADER]).toBe('1');
    expect(init.credentials).toBe('include');
  });

  it('serialises JSON bodies with a content type', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { aiExplanation: 'x' }));
    await api.findings.updateStatus('f1', { status: 'FALSE_POSITIVE', note: 'test file', applyToFuture: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/findings/f1/status');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ status: 'FALSE_POSITIVE', note: 'test file', applyToFuture: true });
  });

  it('redirects to /login with the current path on 401', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { statusCode: 401, message: 'Unauthorized' }));
    await expect(api.projects.get('p1')).rejects.toMatchObject({ status: 401 });
    expect(assign).toHaveBeenCalledWith(`/login?next=${encodeURIComponent('/projects/abc?tab=history')}`);
  });

  it('does not redirect when skipAuthRedirect is set', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { statusCode: 401, message: 'Unauthorized' }));
    await expect(api.auth.me({ skipAuthRedirect: true })).rejects.toBeInstanceOf(ApiError);
    expect(assign).not.toHaveBeenCalled();
  });

  it('parses {statusCode,message,errors} error bodies', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { statusCode: 400, message: 'Validation failed', errors: [{ path: ['target', 'projectName'], message: 'Too long' }] }),
    );
    const err = await apiRequest('/scans/url', { method: 'POST', body: {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    const e = err as ApiError;
    expect(e.status).toBe(400);
    expect(e.message).toBe('Validation failed');
    expect(e.errors).toEqual([{ path: 'target.projectName', message: 'Too long' }]);
  });

  it('joins array messages and falls back to status text', () => {
    expect(parseErrorBody(403, { message: ['a', 'b'] }).message).toBe('a; b');
    expect(parseErrorBody(429, null).message).toMatch(/quota|Too many/);
    expect(parseErrorBody(502, '<html>bad gateway</html>').message).toBe('The API is unreachable.');
  });

  it('wraps network failures in an ApiError with status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api.meta()).rejects.toMatchObject({ status: 0 });
  });

  it('builds URLs and omits empty query values', () => {
    expect(buildUrl('/scans', { organizationId: 'o', projectId: undefined, page: 2, search: '' })).toBe('/api/scans?organizationId=o&page=2');
    expect(api.scans.reportUrl('s 1', 'pdf')).toBe('/api/scans/s%201/report?format=pdf');
  });
});
