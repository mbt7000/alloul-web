import type {
  ConnectResponse,
  ConnectedIntegration,
  Integration,
} from './integrations-types';

const API_BASE =
  process.env.NEXT_PUBLIC_INTEGRATIONS_API_URL ?? 'http://localhost:8010';

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const jwt = localStorage.getItem('alloulq_jwt');
    if (jwt) {
      headers['Authorization'] = `Bearer ${jwt}`;
    } else {
      const tid = localStorage.getItem('dev_tenant_id') ?? 'dev-tenant-001';
      headers['X-Tenant-ID'] = tid;
    }
  }
  return headers;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
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
    apiFetch('/api/v1/integrations'),

  listConnected: (): Promise<ConnectedIntegration[]> =>
    apiFetch('/api/v1/integrations/connected'),

  connect: (id: string, body?: { api_key?: string; bot_token?: string }): Promise<ConnectResponse> =>
    apiFetch(`/api/v1/integrations/${id}/connect`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),

  disconnect: (id: string): Promise<{ message: string }> =>
    apiFetch(`/api/v1/integrations/${id}`, { method: 'DELETE' }),
};
