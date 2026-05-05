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
    if (e.name === 'AbortError') throw new ApiError('انتهت مهلة الطلب. تحقق من اتصالك بالإنترنت.', 0);
    throw new ApiError('تعذّر الوصول للخادم. تحقق من اتصالك بالإنترنت وأعد المحاولة.', 0);
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

// ─── User profile update ──────────────────────────────────────────────────────
export const updateUser = (fields: {
  name?: string;
  bio?: string;
  location?: string;
  skills?: string;
  avatar_url?: string;
}) =>
  apiFetch<import('./auth').AuthUser>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });

// ─── Notifications / Inbox ────────────────────────────────────────────────────
export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body?: string | null;
  read: boolean;
  reference_id?: string | null;
  actor_id?: number | null;
  actor_name?: string | null;
  actor_avatar?: string | null;
  created_at?: string | null;
}
export const getNotifications = (limit = 50) =>
  apiFetch<AppNotification[]>(`/notifications/?limit=${limit}`);
export const markNotificationRead = (id: number) =>
  apiFetch<void>(`/notifications/${id}/read`, { method: 'PATCH' });
export const markAllNotificationsRead = () =>
  apiFetch<void>('/notifications/read-all', { method: 'POST' });
export const getUnreadCount = () =>
  apiFetch<{ count: number }>('/notifications/unread-count');

// ─── Messages / Chat ──────────────────────────────────────────────────────────
export interface Conversation {
  id: number;
  other_user_id: number;
  other_user_name?: string | null;
  other_user_username?: string | null;
  other_user_avatar?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count: number;
}
export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name?: string | null;
  content: string;
  read_at?: string | null;
  created_at?: string | null;
  is_mine: boolean;
}
export const getConversations = () => apiFetch<Conversation[]>('/messages/');
export const startConversation = (userId: number) =>
  apiFetch<Conversation>(`/messages/${userId}`, { method: 'POST' });
export const getMessages = (conversationId: number, afterId = 0) =>
  apiFetch<ChatMessage[]>(`/messages/${conversationId}/messages?after_id=${afterId}&limit=50`);
export const sendMessage = (conversationId: number, content: string) =>
  apiFetch<ChatMessage>(`/messages/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

// ─── Jobs / Hiring ────────────────────────────────────────────────────────────
export interface JobPost {
  id: number;
  company_id?: number | null;
  company_name?: string | null;
  title: string;
  industry?: string | null;
  job_type: string;
  location?: string | null;
  description?: string | null;
  requirements?: string | null;
  salary_range?: string | null;
  required_skills?: string[];
  min_experience?: number | null;
  applications_count: number;
  is_active: boolean;
  created_at?: string | null;
  applied_by_me: boolean;
}
export interface JobApplication {
  id: number;
  job_id: number;
  job_title?: string | null;
  applicant_id: number;
  applicant_name?: string | null;
  applicant_username?: string | null;
  cover_letter?: string | null;
  status: string;
  created_at?: string | null;
}
export const getMyCompanyJobs = () => apiFetch<JobPost[]>('/jobs/my-company');
export const createJob = (body: Partial<JobPost>) =>
  apiFetch<JobPost>('/jobs/', { method: 'POST', body: JSON.stringify(body) });
export const deleteJob = (jobId: number) =>
  apiFetch<void>(`/jobs/${jobId}`, { method: 'DELETE' });
export const getJobApplications = (jobId: number) =>
  apiFetch<JobApplication[]>(`/jobs/${jobId}/applications`);
export const updateApplication = (jobId: number, appId: number, status: 'accepted' | 'rejected') =>
  apiFetch<JobApplication>(`/jobs/${jobId}/applications/${appId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

// ─── File upload ──────────────────────────────────────────────────────────────
export const uploadFile = async (file: File): Promise<{ url: string; filename: string }> => {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/upload/file`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new ApiError('فشل رفع الملف', res.status);
  return res.json();
};

// ─── Tasks (all tasks across projects) ───────────────────────────────────────
export const getAllTasks = () => apiFetch<Task[]>('/projects/all-tasks');
export const createTask = (projectId: number, body: Partial<Task>) =>
  apiFetch<Task>(`/projects/${projectId}/tasks`, {
    method: 'POST', body: JSON.stringify(body),
  });
export const updateTask = (projectId: number, taskId: number, body: Partial<Task>) =>
  apiFetch<Task>(`/projects/${projectId}/tasks/${taskId}`, {
    method: 'PATCH', body: JSON.stringify(body),
  });

// ─── Company creation ─────────────────────────────────────────────────────────
export const createCompany = (body: {
  name: string;
  email?: string;
  company_type?: string;
  location?: string;
  team_size?: string;
  phone?: string;
}) =>
  apiFetch('/companies', {
    method: 'POST',
    body: JSON.stringify(body),
  });
