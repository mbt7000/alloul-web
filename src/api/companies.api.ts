import { apiFetch } from "./client";

export interface CompanyInfo {
  id: number;
  name: string;
  logo_url?: string;
  i_code: string;
}

export const getMyCompany = () =>
  apiFetch<CompanyInfo | null>("/companies/me").catch(() => null);

export const getSubscriptionStatus = () =>
  apiFetch<{ status: string | null; plan_id: string | null }>("/companies/subscription-status").catch(() => ({
    status: null,
    plan_id: null,
  }));

export interface UserProfile {
  id: number;
  username: string;
  name?: string;
  avatar_url?: string;
  bio?: string;
  i_code?: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following: boolean;
  is_self: boolean;
}

export const getUserProfile = (id: number | string) =>
  apiFetch<UserProfile>(`/follows/users/${id}/profile`);

export const followUser = (id: number) => apiFetch(`/follows/${id}`, { method: "POST" });
export const unfollowUser = (id: number) => apiFetch(`/follows/${id}`, { method: "DELETE" });

export interface DashboardStats {
  total_memory_items?: number;
  total_handovers?: number;
  pending_tasks?: number;
  critical_risks?: number;
  team_size?: number;
  knowledge_health_score?: number;
  handover_completion_rate?: number;
  documentation_rate?: number;
  team_stability_score?: number;
}

export interface DashboardActivityItem {
  type: string;
  title: string;
  time?: string | null;
}

export const getDashboardStats = () => apiFetch<DashboardStats>("/dashboard/stats");

export const getDashboardActivity = (limit = 20) =>
  apiFetch<DashboardActivityItem[]>(`/dashboard/activity?limit=${limit}`);

export interface ProjectRow {
  id: number;
  user_id: number;
  company_id?: number | null;
  name: string;
  description?: string | null;
  status: string;
  tasks_count?: number;
  completed_count?: number;
  created_at?: string | null;
}

export const getProjects = () => apiFetch<ProjectRow[]>("/projects/");

export interface CompanyStats {
  total_members: number;
  total_departments: number;
  plan_id?: string | null;
  subscription_status?: string | null;
  max_employees?: number | null;
}

export const getCompanyStats = () => apiFetch<CompanyStats>("/companies/stats");

export interface CompanyMemberRow {
  id: number;
  company_id: number;
  user_id: number;
  role: string;
  department_id?: number | null;
  i_code: string;
  manager_id?: number | null;
  job_title?: string | null;
}

export const getCompanyMembers = () => apiFetch<CompanyMemberRow[]>("/companies/members");

export interface HandoverRow {
  id: number;
  user_id: number;
  title: string;
  from_person?: string | null;
  to_person?: string | null;
  department?: string | null;
  status: string;
  content?: string | null;
  score: number;
  tasks: number;
  completed_tasks: number;
  created_at?: string | null;
}

export const getHandovers = () => apiFetch<HandoverRow[]>("/handover/");

export type HandoverLifecycleStatus = "open" | "in_progress" | "submitted" | "accepted" | "closed";

export interface HandoverWorkItem {
  id: string;
  serial_no: string;
  title: string;
  owner_name: string;
  current_assignee_name: string;
  status: HandoverLifecycleStatus;
  latest_update?: string | null;
}

export const getHandoverWorkItems = () => apiFetch<HandoverWorkItem[]>("/handover/work-items").catch(() => []);

export const updateHandoverWorkItemStatus = (id: string, status: HandoverLifecycleStatus) =>
  apiFetch(`/handover/work-items/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export interface CompanyCandidateRow {
  id: string;
  full_name: string;
  role: string;
  years_experience: number;
  skills: string[];
  status: "pending" | "shortlisted" | "interview" | "accepted" | "rejected";
}

export const getCompanyCandidates = (role?: string) => {
  const q = role?.trim() ? `?role=${encodeURIComponent(role.trim())}` : "";
  return apiFetch<CompanyCandidateRow[]>(`/companies/hiring/candidates${q}`).catch(() => []);
};

export const setCompanyCandidateStatus = (candidateId: string, status: CompanyCandidateRow["status"]) =>
  apiFetch(`/companies/hiring/candidates/${encodeURIComponent(candidateId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export interface DealRow {
  id: number;
  user_id: number;
  company: string;
  value: number;
  stage: string;
  probability: number;
  contact?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export const getDeals = () => apiFetch<DealRow[]>("/deals/");

export interface AdRow {
  id: number;
  company_id: number;
  ad_type: string;
  content?: string | null;
  image_url?: string | null;
  status: string;
  impressions: number;
  company_name?: string | null;
}

export const getWorkspaceAds = () => apiFetch<AdRow[]>("/ads/");

export interface AgentMessageRow {
  id: string;
  role: string;
  content: string;
  created_at?: string | null;
}

export const getAgentHistory = (mode?: string) => {
  const q = mode?.trim() ? `?mode=${encodeURIComponent(mode.trim())}` : "";
  return apiFetch<AgentMessageRow[]>(`/agent/history${q}`);
};
