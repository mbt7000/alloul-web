import { apiFetch } from "./client";

export interface CompanyInfo {
  id: number;
  name: string;
  logo_url?: string;
  i_code: string;
}

export const getMyCompany = () =>
  apiFetch<CompanyInfo | null>("/companies/me").catch(() => null);

export const createCompany = (body: {
  name: string;
  company_type?: string;
  size?: string;
  founder_name?: string;
  founder_email?: string;
}) => apiFetch<CompanyInfo>("/companies", { method: "POST", body: JSON.stringify(body) });

export const getSubscriptionStatus = () =>
  apiFetch<{ status: string | null; plan_id: string | null }>("/companies/subscription-status").catch(() => ({
    status: null,
    plan_id: null,
  }));

export interface UserProfile {
  id: number;
  username: string;
  name?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  bio?: string | null;
  i_code?: string | null;
  is_self: boolean;
  created_at?: string | null;
}

export const getUserProfile = (id: number | string) =>
  apiFetch<UserProfile>(`/companies/members/${id}/profile`).catch(() =>
    apiFetch<UserProfile>(`/auth/me`)
  );

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
  due_date?: string | null;
  tasks_count?: number;
  completed_count?: number;
  created_at?: string | null;
}

export interface TaskRow {
  id: number;
  project_id: number;
  title: string;
  description?: string | null;
  assignee_id?: number | null;
  assignee_name?: string | null;
  status: string;
  due_date?: string | null;
  priority: "high" | "medium" | "low";
  created_at?: string | null;
}

export const getProjects = (companyId?: number) => {
  // Always include company projects when companyId is available
  const q = companyId != null ? `?company_id=${companyId}` : "";
  return apiFetch<ProjectRow[]>(`/projects/${q}`).then((list) => {
    // If we got company projects, also merge personal projects so nothing is hidden
    if (companyId != null) {
      return apiFetch<ProjectRow[]>("/projects/")
        .then((personal) => {
          const ids = new Set(list.map((p) => p.id));
          return [...list, ...personal.filter((p) => !ids.has(p.id))];
        })
        .catch(() => list);
    }
    return list;
  });
};

export const createProject = (body: {
  name: string;
  description?: string;
  due_date?: string;
  status?: string;
}) => apiFetch<ProjectRow>("/projects/", { method: "POST", body: JSON.stringify(body) });

export const updateProject = (id: number, body: { name?: string; description?: string; status?: string; due_date?: string }) =>
  apiFetch<ProjectRow>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const getProjectTasks = (projectId: number) =>
  apiFetch<TaskRow[]>(`/projects/${projectId}/tasks`);

export const getAllCompanyTasks = (companyId?: number) => {
  const q = companyId != null ? `?company_id=${companyId}` : "";
  return apiFetch<TaskRow[]>(`/projects/all-tasks${q}`).catch(() => [] as TaskRow[]);
};

export const createTask = (projectId: number, body: {
  title: string;
  description?: string;
  assignee_id?: number;
  due_date?: string;
  priority?: string;
}) => apiFetch<TaskRow>(`/projects/${projectId}/tasks`, { method: "POST", body: JSON.stringify(body) });

export const updateTask = (projectId: number, taskId: number, body: {
  title?: string;
  status?: string;
  assignee_id?: number;
  due_date?: string;
  priority?: string;
}) => apiFetch<TaskRow>(`/projects/${projectId}/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(body) });

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
  work_id?: string | null;
  manager_id?: number | null;
  job_title?: string | null;
  phone?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  avatar_url?: string | null;
}

export const getCompanyMembers = () => apiFetch<CompanyMemberRow[]>("/companies/members");

export const updateMemberRole = (memberId: number, role: string, jobTitle?: string) =>
  apiFetch<CompanyMemberRow>(`/companies/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify({ role, job_title: jobTitle }),
  });

export const removeMember = (memberId: number) =>
  apiFetch(`/companies/members/${memberId}`, { method: "DELETE" });

export interface DepartmentRow { id: number; company_id: number; name: string; }

export const getDepartments = () => apiFetch<DepartmentRow[]>("/companies/departments");

export const createDepartment = (name: string) =>
  apiFetch<DepartmentRow>("/companies/departments", { method: "POST", body: JSON.stringify({ name }) });

export const deleteDepartment = (id: number) =>
  apiFetch(`/companies/departments/${id}`, { method: "DELETE" });

export const sendInvitation = (iCode: string, role: string = "employee") =>
  apiFetch<{ id: number; message: string }>("/companies/invite", {
    method: "POST",
    body: JSON.stringify({ i_code: iCode, role }),
  });

export const deleteProject = (id: number) =>
  apiFetch(`/projects/${id}`, { method: "DELETE" });

export const deleteTask = (projectId: number, taskId: number) =>
  apiFetch(`/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" });

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
  pending_actions?: string[] | null;
  risk_level?: string | null;
  created_at?: string | null;
}

export const getHandovers = () => apiFetch<HandoverRow[]>("/handover/");

export const createHandover = (body: {
  title: string;
  from_person?: string;
  to_person?: string;
  department?: string;
  content?: string;
  status?: string;
}) => apiFetch<HandoverRow>("/handover/", { method: "POST", body: JSON.stringify(body) });

export const updateHandover = (id: number, body: {
  title?: string;
  from_person?: string;
  to_person?: string;
  department?: string;
  status?: string;
  content?: string;
  tasks?: number;
  completed_tasks?: number;
}) => apiFetch<HandoverRow>(`/handover/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteHandover = (id: number) =>
  apiFetch(`/handover/${id}`, { method: "DELETE" });

export const analyzeHandover = (id: number) =>
  apiFetch<{ analysis: string; handover_id: number }>(`/handover/${id}/ai-analyze`, { method: "POST" });

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

export const createDeal = (body: {
  company: string;
  value: number;
  stage: string;
  probability?: number;
  contact?: string;
  notes?: string;
}) => apiFetch<DealRow>("/deals/", { method: "POST", body: JSON.stringify(body) });

export const updateDeal = (id: number, body: { stage?: string; value?: number; probability?: number; notes?: string }) =>
  apiFetch<DealRow>(`/deals/${id}`, { method: "PATCH", body: JSON.stringify(body) });

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

export const analyzeWorkspace = (topic: "dashboard" | "tasks" | "deals" | "meetings", extra?: string) =>
  apiFetch<{ summary: string; topic: string }>("/agent/analyze", {
    method: "POST",
    body: JSON.stringify({ topic, extra }),
  });

// ─── Knowledge Base / Memory ──────────────────────────────────────────────────

export interface KnowledgeItem {
  id: number;
  user_id: number;
  company_id?: number | null;
  type: string;
  title: string;
  description?: string | null;
  project?: string | null;
  department?: string | null;
  tags: string[];
  importance: string;
  owner?: string | null;
  date?: string | null;
  created_at?: string | null;
}

export interface KnowledgeStats {
  total: number;
  by_type: Record<string, number>;
  high_importance: number;
}

export const getKnowledgeItems = (params?: {
  type?: string;
  q?: string;
  company?: boolean;
}) => {
  const p = new URLSearchParams();
  if (params?.type) p.set("type", params.type);
  if (params?.q) p.set("q", params.q);
  if (params?.company) p.set("company", "true");
  const qs = p.toString() ? `?${p.toString()}` : "";
  return apiFetch<KnowledgeItem[]>(`/memory/${qs}`).catch(() => [] as KnowledgeItem[]);
};

export const getKnowledgeStats = () =>
  apiFetch<KnowledgeStats>("/memory/stats").catch(() => ({ total: 0, by_type: {}, high_importance: 0 }));

export const createKnowledgeItem = (body: {
  title: string;
  type?: string;
  description?: string;
  project?: string;
  department?: string;
  tags?: string;
  importance?: string;
}) => apiFetch<KnowledgeItem>("/memory/", { method: "POST", body: JSON.stringify(body) });

export const deleteKnowledgeItem = (id: number) =>
  apiFetch(`/memory/${id}`, { method: "DELETE" });

export const importHandoversToKnowledge = () =>
  apiFetch<{ imported: number; total_handovers: number }>("/memory/import-handovers", { method: "POST" });

// ─── Company Role & Permissions ──────────────────────────────────────────────

export type CompanyRole = "owner" | "admin" | "manager" | "employee" | "member";

export interface MyRoleResponse {
  role: CompanyRole | null;
  company_id: number | null;
  member_id: number | null;
}

export const getMyRole = () =>
  apiFetch<MyRoleResponse>("/companies/my-role").catch(() => ({
    role: null,
    company_id: null,
    member_id: null,
  }));

// ─── Invitations ─────────────────────────────────────────────────────────────

export interface PendingInvitation {
  id: number;
  company_id: number;
  company_name: string;
  inviter_name?: string | null;
  role: string;
  created_at?: string | null;
}

export const getPendingInvitations = () =>
  apiFetch<PendingInvitation[]>("/companies/invitations").catch(() => []);

export const acceptInvitation = (id: number) =>
  apiFetch(`/companies/invitations/${id}/accept`, { method: "POST" });

export const rejectInvitation = (id: number) =>
  apiFetch(`/companies/invitations/${id}/reject`, { method: "POST" });

// ─── Invite Link ─────────────────────────────────────────────────────────────

export interface InviteLinkInfo {
  invite_code: string;
  company_name: string;
  expires_in_hours: number;
}

export const getInviteLink = () =>
  apiFetch<InviteLinkInfo>("/companies/invite-link");

export const joinByInviteCode = (invite_code: string) =>
  apiFetch<{ message: string; company_id: number }>("/companies/join", {
    method: "POST",
    body: JSON.stringify({ invite_code }),
  });

// ─── Onboarding ──────────────────────────────────────────────────────────────

export interface OnboardingStatus {
  step_profile: boolean;
  step_team: boolean;
  step_invite: boolean;
  step_project: boolean;
  completed: boolean;
}

export const getOnboardingStatus = () =>
  apiFetch<OnboardingStatus>("/companies/onboarding").catch(() => null);

export const completeOnboardingStep = (step: "profile" | "team" | "invite" | "project") =>
  apiFetch("/companies/onboarding/complete-step", {
    method: "POST",
    body: JSON.stringify({ step }),
  });

// ─── Meetings ─────────────────────────────────────────────────────────────────

export interface MeetingAttendee {
  user_id: number;
  status: "invited" | "accepted" | "declined";
}

export interface MeetingRow {
  id: number;
  company_id: number;
  created_by: number;
  title: string;
  description?: string | null;
  meeting_date: string;
  meeting_time?: string | null;
  duration_minutes: number;
  location?: string | null;
  status: "scheduled" | "in_progress" | "done" | "cancelled";
  notes?: string | null;
  action_items?: string | null;
  project_id?: number | null;
  attendees: MeetingAttendee[];
  created_at?: string | null;
}

export const getMeetings = (upcoming?: boolean) => {
  const q = upcoming ? "?upcoming=true" : "";
  return apiFetch<MeetingRow[]>(`/meetings/${q}`).catch(() => [] as MeetingRow[]);
};

export const createMeeting = (body: {
  title: string;
  description?: string;
  meeting_date: string;
  meeting_time?: string;
  duration_minutes?: number;
  location?: string;
  project_id?: number;
  attendee_ids?: number[];
}) => apiFetch<MeetingRow>("/meetings/", { method: "POST", body: JSON.stringify(body) });

export const updateMeeting = (id: number, body: {
  title?: string;
  status?: string;
  notes?: string;
  action_items?: string;
  meeting_date?: string;
  meeting_time?: string;
  location?: string;
  project_id?: number;
}) => apiFetch<MeetingRow>(`/meetings/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const markMeetingDone = (id: number, notes?: string, actionItems?: string) => {
  const params = new URLSearchParams();
  if (notes) params.set("notes", notes);
  if (actionItems) params.set("action_items", actionItems);
  const q = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<MeetingRow>(`/meetings/${id}/done${q}`, { method: "POST" });
};

export const deleteMeeting = (id: number) =>
  apiFetch(`/meetings/${id}`, { method: "DELETE" });

// ─── Channels / Team Chat ─────────────────────────────────────────────────────

export interface ChannelRow {
  id: number;
  company_id: number;
  name: string;
  description?: string | null;
  type: string;
  created_at?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  message_count: number;
}

export interface ChannelAuthor {
  id: number;
  name: string;
  avatar_url?: string | null;
}

export interface ChannelMessageRow {
  id: number;
  channel_id: number;
  user_id: number;
  content: string;
  author: ChannelAuthor;
  created_at?: string | null;
  is_self: boolean;
}

export const getChannels = () =>
  apiFetch<ChannelRow[]>("/channels/").catch(() => [] as ChannelRow[]);

export const createChannel = (body: { name: string; type?: string; description?: string }) =>
  apiFetch<ChannelRow>("/channels/", { method: "POST", body: JSON.stringify(body) });

export const deleteChannel = (id: number) =>
  apiFetch(`/channels/${id}`, { method: "DELETE" });

export const getChannelMessages = (channelId: number, afterId?: number) => {
  const q = afterId ? `?after_id=${afterId}&limit=50` : "?limit=50";
  return apiFetch<ChannelMessageRow[]>(`/channels/${channelId}/messages${q}`).catch(() => [] as ChannelMessageRow[]);
};

export const sendChannelMessage = (channelId: number, content: string) =>
  apiFetch<ChannelMessageRow>(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });

export const deleteChannelMessage = (channelId: number, messageId: number) =>
  apiFetch(`/channels/${channelId}/messages/${messageId}`, { method: "DELETE" });

// ─── Work ID / Employee Profile ───────────────────────────────────────────────

export interface MyEmployeeProfile {
  membership_id: number;
  company_id: number;
  company_name: string;
  role: string;
  job_title: string | null;
  work_id: string;
  joined_at: string | null;
}

export interface WorkIdPreview {
  work_id: string;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  current_company: string | null;
  role: string;
  job_title: string | null;
}

export interface AddByWorkIdResponse {
  message: string;
  membership_id: number;
  work_id: string;
  user_name: string | null;
}

export const getMyEmployeeProfile = () =>
  apiFetch<MyEmployeeProfile>("/employees/me");

export const validateWorkId = (work_id: string) =>
  apiFetch<WorkIdPreview>("/employees/validate-work-id", {
    method: "POST",
    body: JSON.stringify({ work_id }),
  });

export const addMemberByWorkId = (body: {
  work_id: string;
  role?: string;
  job_title?: string;
  department_id?: number;
}) =>
  apiFetch<AddByWorkIdResponse>("/employees/add-by-work-id", {
    method: "POST",
    body: JSON.stringify(body),
  });
