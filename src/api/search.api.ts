import { apiFetch } from "./client";

export interface SearchResultItem {
  type: string;
  id: string;
  title: string;
  description?: string;
  avatar_url?: string | null;
  relevance_score?: number;
}

export const unifiedSearch = (q: string) => {
  const trimmed = q.trim();
  if (!trimmed) return Promise.resolve([] as SearchResultItem[]);
  return apiFetch<SearchResultItem[]>(`/search?q=${encodeURIComponent(trimmed)}`);
};
