// ALLOUL&Q web — API client
// Connects to the SAME backend as the mobile app (https://api.alloul.app)
// Uses JWT stored in localStorage by /login page

import { getToken, clearToken } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.alloul.app';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 15000,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new ApiError('timeout', 0);
    throw new ApiError('network', 0);
  }
  clearTimeout(timer);

  if (!res.ok) {
    if (res.status === 401 && token) {
      clearToken();
    }
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body.detail === 'string') msg = body.detail;
      else if (Array.isArray(body.detail)) msg = body.detail.map((d: any) => d?.msg || '').join('; ');
    } catch {}
    throw new ApiError(msg, res.status);
  }

  if (res.status === 204) return null as T;
  return res.json();
}

// ─── Typed helpers (mirror the mobile app's API client) ────────────────────

export interface DashboardStats {
  total_memory_items?: number;
  total_handovers?: number;
  pending_tasks?: number;
  team_size?: number;
}

export interface DashboardActivityItem {
  type: string;
  title: string;
  time?: string | null;
}

// ─── Endpoints (identical to mobile app) ────────────────────────────────────

export const login = (email: string, password: string) =>
  apiFetch<{ access_token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const register = (username: string, email: string, password: string) =>
  apiFetch<{ access_token: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });

// OAuth: get Firebase ID token from provider (Google/Apple/GitHub), exchange
// for our backend JWT via /auth/firebase — same flow as the mobile app.
export const loginWithFirebase = (idToken: string) =>
  apiFetch<{ access_token: string }>('/auth/firebase', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  });

export const getCurrentUser = () => apiFetch<import('./auth').AuthUser>('/auth/me');

export const getDashboardStats = () => apiFetch<DashboardStats>('/dashboard/stats');

export const getDashboardActivity = (limit = 20) =>
  apiFetch<DashboardActivityItem[]>(`/dashboard/activity?limit=${limit}`);

// ─── Company services (same endpoints as mobile) ───────────────────────────

export interface CompanyMember {
  id: number;
  user_id: number;
  user_name?: string | null;
  user_email?: string | null;
  role: string;
  job_title?: string | null;
}

export interface Project {
  id: number;
  name: string;
  description?: string | null;
  status: string;
  due_date?: string | null;
  tasks_count?: number;
  completed_count?: number;
}

export interface Task {
  id: number;
  project_id?: number | null;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  assigned_to?: number | null;
  due_date?: string | null;
}

export interface Meeting {
  id: number;
  title: string;
  meeting_date?: string | null;
  meeting_time?: string | null;
  duration_minutes?: number;
  location?: string | null;
  status: string;
}

export interface HandoverRow {
  id: number;
  handover_title: string;
  client_name?: string | null;
  from_person?: string | null;
  to_person?: string | null;
  risk_level?: string | null;
  deadline?: string | null;
  created_at?: string | null;
}

export const getCompanyMembers = () =>
  apiFetch<CompanyMember[]>('/companies/members');

export const getProjects = () => apiFetch<Project[]>('/projects/');

export const getMeetings = (upcoming = false) =>
  apiFetch<Meeting[]>(`/meetings/${upcoming ? '?upcoming=true' : ''}`);

export const getHandovers = () => apiFetch<HandoverRow[]>('/handover/');

export const getCompanyDailyJoinUrl = () =>
  apiFetch<{ join_url: string; room_name: string; provider: string }>('/daily/company-join');

// ─── Calls ───────────────────────────────────────────────────────────────
export interface CallHistoryItem {
  id: number;
  caller_id: number;
  callee_id: number;
  started_at?: string | null;
  ended_at?: string | null;
  duration_seconds?: number | null;
  status?: string | null;
  call_type?: string | null;
}

export const getCallHistory = () => apiFetch<CallHistoryItem[]>('/call/history');

// ─── Deals / CRM ─────────────────────────────────────────────────────────
export interface Deal {
  id: number;
  company: string;
  contact_name?: string | null;
  value: number;
  stage: string;
  probability?: number | null;
  notes?: string | null;
  expected_close_date?: string | null;
  created_at?: string | null;
}

export const getDeals = () => apiFetch<Deal[]>('/deals/');

// ─── AI helpers ──────────────────────────────────────────────────────────
export interface AiHealth {
  claude: boolean;
  ollama: boolean;
  ollama_models: string[] | null;
  all_healthy: boolean;
}

export const getAiHealth = () => apiFetch<AiHealth>('/ai/health');

export const summarizeHandover = (handover_id: number, language: 'ar' | 'en' = 'ar') =>
  apiFetch<{ handover_id: number; title: string; summary: string }>('/agent/handover/summary', {
    method: 'POST',
    body: JSON.stringify({ handover_id, language }),
  });

export const summarizeTasks = (
  opts: { project_id?: number; status_filter?: string; language?: 'ar' | 'en' } = {},
) =>
  apiFetch<{ summary: string; count: number }>('/agent/tasks/summary', {
    method: 'POST',
    body: JSON.stringify({ language: 'ar', ...opts }),
  });
