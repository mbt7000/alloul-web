import Constants from "expo-constants";

/** Production API host (override with `EXPO_PUBLIC_API_URL` in Expo / EAS). */
export const DEFAULT_API_BASE_URL = "https://api.alloul.app";

type ApiExtra = {
  apiUrl?: string;
  apiDocsUrl?: string;
  apiOpenapiUrl?: string;
};

function readExtra(): ApiExtra {
  return (Constants.expoConfig?.extra ?? {}) as ApiExtra;
}

export function trimTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, "");
}

function normalizeApiBaseUrl(raw?: string): string {
  const fallback = DEFAULT_API_BASE_URL;
  const candidate = trimTrailingSlashes((raw ?? "").trim());
  if (!candidate) return fallback;
  if (candidate === "https://api" || candidate === "http://api") return fallback;
  try {
    const parsed = new URL(candidate);
    if (!parsed.hostname.includes(".")) return fallback;
    return candidate;
  } catch {
    return fallback;
  }
}

/** Base URL with no trailing slash — paths in `apiFetch` must start with `/`. */
export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(readExtra().apiUrl);
}

/** Swagger UI (e.g. FastAPI `/docs`). Override with `EXPO_PUBLIC_API_DOCS_URL`. */
export function getApiDocsUrl(): string {
  const e = readExtra();
  if (e.apiDocsUrl) return trimTrailingSlashes(e.apiDocsUrl);
  return `${getApiBaseUrl()}/docs`;
}

/** OpenAPI JSON spec. Override with `EXPO_PUBLIC_API_OPENAPI_URL`. */
export function getApiOpenapiUrl(): string {
  const e = readExtra();
  if (e.apiOpenapiUrl) return trimTrailingSlashes(e.apiOpenapiUrl);
  return `${getApiBaseUrl()}/openapi.json`;
}
