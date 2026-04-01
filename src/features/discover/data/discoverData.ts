/**
 * Discover catalog + local filter — swap for API `/discover/search` later.
 */

export type DiscoverKind = "person" | "company" | "project" | "job" | "service";

export type DiscoverScope = "all" | DiscoverKind;

export type DiscoverItem = {
  id: string;
  kind: DiscoverKind;
  title: string;
  subtitle: string;
  meta?: string;
  tags?: string[];
};

export const TRENDING_TAGS = ["Remote", "Hiring", "B2B", "Design", "Engineering", "Growth", "Enterprise", "Startup"];

export const FEATURED_COMPANIES: DiscoverItem[] = [
  { id: "fc1", kind: "company", title: "Alloul Labs", subtitle: "Workspace OS", meta: "Technology", tags: ["Enterprise", "B2B"] },
  { id: "fc2", kind: "company", title: "Nile Commerce", subtitle: "Retail network", meta: "Retail", tags: ["Growth"] },
  { id: "fc3", kind: "company", title: "Gulf Ops", subtitle: "Logistics", meta: "Operations", tags: ["Enterprise"] },
];

export const SUGGESTED_PEOPLE: DiscoverItem[] = [
  { id: "sp1", kind: "person", title: "Sara M.", subtitle: "Product Lead", meta: "12 mutuals", tags: ["Design"] },
  { id: "sp2", kind: "person", title: "Omar K.", subtitle: "Staff Engineer", meta: "8 mutuals", tags: ["Engineering"] },
  { id: "sp3", kind: "person", title: "Layla H.", subtitle: "People Partner", meta: "5 mutuals", tags: ["Hiring"] },
];

export const PROJECT_HIGHLIGHTS: DiscoverItem[] = [
  { id: "ph1", kind: "project", title: "Q1 Launch Pod", subtitle: "Cross-team delivery", meta: "Public", tags: ["Engineering"] },
  { id: "ph2", kind: "project", title: "Partner API beta", subtitle: "Developer ecosystem", meta: "Open", tags: ["B2B"] },
];

export const JOBS_SNAPSHOT: DiscoverItem[] = [
  { id: "jb1", kind: "job", title: "Senior React Native", subtitle: "Alloul · Mobile", meta: "Remote", tags: ["Remote", "Engineering"] },
  { id: "jb2", kind: "job", title: "Growth Lead", subtitle: "Nile Commerce", meta: "Hybrid", tags: ["Growth", "Hiring"] },
];

export const SERVICES_HIGHLIGHTS: DiscoverItem[] = [
  { id: "sv1", kind: "service", title: "Handover templates", subtitle: "Marketplace", meta: "Free tier", tags: ["Enterprise"] },
  { id: "sv2", kind: "service", title: "SSO & SCIM", subtitle: "Add-on", meta: "From $199/mo", tags: ["B2B", "Enterprise"] },
];

const ALL_CATALOG: DiscoverItem[] = [
  ...FEATURED_COMPANIES,
  ...SUGGESTED_PEOPLE,
  ...PROJECT_HIGHLIGHTS,
  ...JOBS_SNAPSHOT,
  ...SERVICES_HIGHLIGHTS,
];

export function discoverCatalog(): DiscoverItem[] {
  return ALL_CATALOG;
}

export function filterDiscover(scope: DiscoverScope, query: string, tagFilter?: string | null): DiscoverItem[] {
  const q = query.trim().toLowerCase();
  const tag = tagFilter?.trim().toLowerCase() ?? "";
  return ALL_CATALOG.filter((item) => {
    if (scope !== "all" && item.kind !== scope) return false;
    if (tag && !(item.tags ?? []).some((t) => t.toLowerCase() === tag)) return false;
    if (!q) return true;
    const hay = `${item.title} ${item.subtitle} ${item.meta ?? ""} ${(item.tags ?? []).join(" ")}`.toLowerCase();
    return hay.includes(q);
  });
}

const KIND_ORDER: DiscoverKind[] = ["person", "company", "project", "job", "service"];

const KIND_SECTION_LABEL: Record<DiscoverKind, string> = {
  person: "People",
  company: "Companies",
  project: "Projects",
  job: "Jobs",
  service: "Services",
};

export type DiscoverGroupedSection = { kind: DiscoverKind; title: string; items: DiscoverItem[] };

/** Group flat results into entity sections (search results mode, scope = all). */
export function groupDiscoverResults(items: DiscoverItem[]): DiscoverGroupedSection[] {
  const sections: DiscoverGroupedSection[] = [];
  for (const kind of KIND_ORDER) {
    const bucket = items.filter((i) => i.kind === kind);
    if (bucket.length) sections.push({ kind, title: KIND_SECTION_LABEL[kind], items: bucket });
  }
  return sections;
}
