import i18n from "../i18n";
import { getApiBaseUrl, getApiDocsUrl, getApiOpenapiUrl } from "../config/env";
import { emitAuthSessionReset } from "../state/auth/authInvalidation";
import { getToken, removeToken, setToken } from "../storage/token";

export { getApiBaseUrl, getApiDocsUrl, getApiOpenapiUrl };
export { getToken, setToken, removeToken };

function apiBaseUrl(): string {
  return getApiBaseUrl();
}

const API_TIMEOUT_MS = 12000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = API_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function pingApiHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetchWithTimeout(`${apiBaseUrl()}/health`, { method: "GET" });

    if (!res.ok) {
      return { ok: false, detail: `HTTP ${res.status}` };
    }

    const j = await res.json().catch(() => ({}));

    return {
      ok: true,
      detail: typeof j?.status === "string" ? j.status : "ok",
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return { ok: false, detail: msg };
  }
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept-Language": i18n.language || "en",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;

  try {
    res = await fetchWithTimeout(`${apiBaseUrl()}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      throw { message: "NETWORK_TIMEOUT", status: 0 };
    }
    throw { message: "NETWORK_UNREACHABLE", status: 0 };
  }

  if (!res.ok) {
    if (res.status === 401) {
      await removeToken();
      emitAuthSessionReset("expired");
    }

    const err = await res.json().catch(() => ({ detail: res.statusText }));

    let msg: string;

    if (typeof err.detail === "string") msg = err.detail;
    else if (Array.isArray(err.detail)) {
      msg = err.detail
        .map((d: { msg?: string }) => d?.msg || JSON.stringify(d))
        .join("; ");
    } else {
      msg = err.message || "Request failed";
    }

    throw { message: msg, status: res.status };
  }

  if (res.status === 204) return null as T;

  return res.json();
}