import { apiFetch } from "./client";

export interface ApiPost {
  id: number;
  user_id: number;
  content: string;
  image_url?: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  author_name?: string | null;
  author_username?: string | null;
  author_avatar?: string | null;
  author_verified?: boolean;
  created_at?: string | null;
  liked_by_me: boolean;
  reposted_by_me: boolean;
  saved_by_me: boolean;
}

export const getPosts = (limit = 20, offset = 0) =>
  apiFetch<ApiPost[]>(`/posts/?limit=${limit}&offset=${offset}`);

export const getFollowingPosts = (limit = 20, offset = 0) =>
  apiFetch<ApiPost[]>(`/posts/?following=true&limit=${limit}&offset=${offset}`);

export const createPost = (
  content: string,
  image_url?: string,
  visibility: "public" | "internal" = "public"
) =>
  apiFetch<ApiPost>("/posts/", { method: "POST", body: JSON.stringify({ content, image_url, visibility }) });

export const likePost = (id: number) => apiFetch(`/posts/${id}/like`, { method: "POST" });
export const unlikePost = (id: number) => apiFetch(`/posts/${id}/unlike`, { method: "POST" });
export const deletePost = (id: number) => apiFetch(`/posts/${id}`, { method: "DELETE" });

export const getSavedPosts = (limit = 30, offset = 0) =>
  apiFetch<ApiPost[]>(`/posts/saved?limit=${limit}&offset=${offset}`);

export interface JobPostRow {
  id: string;
  title: string;
  company_name: string;
  location?: string | null;
  employment_type?: string | null;
  skill_tags?: string[] | null;
  posted_at?: string | null;
}

export interface JobApplicationInput {
  full_name: string;
  email: string;
  role: string;
  years_experience: number;
  skills: string[];
  certifications?: string;
  previous_work?: string;
}

export const getMediaJobs = (search?: string) => {
  const q = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiFetch<JobPostRow[]>(`/jobs${q}`).catch(() => []);
};

export const applyToMediaJob = (jobId: string, input: JobApplicationInput) =>
  apiFetch(`/jobs/${encodeURIComponent(jobId)}/apply`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export interface CommunityRow {
  id: number;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  creator_id: number;
  creator_name?: string | null;
  members_count?: number;
  is_member?: boolean;
  created_at?: string | null;
}

export const getCommunities = (limit = 20, offset = 0) =>
  apiFetch<CommunityRow[]>(`/communities/?limit=${limit}&offset=${offset}`);

export interface MarketplaceCompanyRow {
  id: string;
  name: string;
  industry?: string | null;
  size?: string | null;
  location?: string | null;
  verified?: boolean;
  description?: string | null;
}

export const getMarketplaceCompanies = (search?: string) => {
  const s = search?.trim();
  return apiFetch<MarketplaceCompanyRow[]>(
    s ? `/marketplace/?search=${encodeURIComponent(s)}` : "/marketplace/"
  );
};
