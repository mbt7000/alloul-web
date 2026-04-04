import { apiFetch } from "./client";
import { getToken, setToken } from "../storage/token";

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  name?: string;
  avatar_url?: string;
  bio?: string;
  i_code?: string;
  verified?: number;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  created_at?: string;
  is_admin?: boolean;
}

async function persistAccessToken(accessToken: string): Promise<void> {
  await setToken(accessToken);
  await new Promise((r) => setTimeout(r, 80));
  let saved = await getToken();
  if (!saved) saved = await getToken();
  if (!saved) {
    throw { message: "SESSION_STORAGE_FAILED", status: 0 };
  }
}

export async function login(email: string, password: string) {
  const res = await apiFetch<{ access_token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  await persistAccessToken(res.access_token);
  return res;
}

export async function register(username: string, email: string, password: string) {
  const res = await apiFetch<{ access_token: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
  await persistAccessToken(res.access_token);
  return res;
}

export async function loginWithFirebase(idToken: string) {
  const res = await apiFetch<{ access_token: string }>("/auth/firebase", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
  await persistAccessToken(res.access_token);
  return res;
}

export async function loginWithAzureAd(idToken: string) {
  const res = await apiFetch<{ access_token: string }>("/auth/azure-ad", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
  await persistAccessToken(res.access_token);
  return res;
}

export async function getCurrentUser(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me");
}
