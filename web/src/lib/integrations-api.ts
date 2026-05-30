import type {
  ConnectResponse,
  ConnectedIntegration,
  Integration,
} from './integrations-types';

// Browser → same-origin proxy at /api/integrations/* (Next.js rewrites to backend)
// Server  → direct HTTP to integrations backend (no mixed-content issue)
function apiBase() {
  if (typeof window !== 'undefined') return '/api/integrations/integrations';
  return (process.env.INTEGRATIONS_API_URL ?? 'http://srv1431166.hstgr.cloud:8011') + '/api/v1/integrations';
}

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const jwt = localStorage.getItem('alloul_token');
    if (jwt) {
      headers['Authorization'] = `Bearer ${jwt}`;
    }
  }
  return headers;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.detail ?? body.message ?? message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const integrationApi = {
  listAll: (): Promise<Integration[]> =>
    apiFetch(''),

  listConnected: (): Promise<ConnectedIntegration[]> =>
    apiFetch('/connected'),

  connect: (id: string, body?: { api_key?: string; bot_token?: string }): Promise<ConnectResponse> =>
    apiFetch(`/${id}/connect`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),

  disconnect: (id: string): Promise<{ message: string }> =>
    apiFetch(`/${id}`, { method: 'DELETE' }),
};
