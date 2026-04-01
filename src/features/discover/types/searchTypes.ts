import type { DiscoverScope } from "../data/discoverData";

/** Where the user opened search from — analytics + subtle UX. */
export type SearchSource = "home" | "feed" | "discover";

export const UNIFIED_SEARCH_PLACEHOLDER = "ابحث عن أشخاص أو شركات أو وظائف...";

export const VALID_DISCOVER_SCOPES: DiscoverScope[] = ["all", "person", "company", "project", "job", "service"];

export function parseDiscoverScopeParam(v: unknown): DiscoverScope | undefined {
  if (typeof v !== "string") return undefined;
  return VALID_DISCOVER_SCOPES.includes(v as DiscoverScope) ? (v as DiscoverScope) : undefined;
}

export function parseSearchSourceParam(v: unknown): SearchSource | undefined {
  if (v === "home" || v === "feed" || v === "discover") return v;
  return undefined;
}

export type DiscoverSearchParams = {
  q?: string;
  scope?: DiscoverScope;
  source?: SearchSource;
};
