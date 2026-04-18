import { apiFetch } from "./client";
import { getToken, setToken } from "../storage/token";

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  name?: string;
  avatar_url?: string;
  cover_url?: string | null;
  bio?: string;
  i_code?: string;
  phone?: string;
  verified?: number;
  created_at?: string;
  is_admin?: boolean;
  location?: string | null;
  skills?: string | null;   // used as "headline" in the UI
  voice_profile_url?: string | null;
}

export interface UpdateMeBody {
  name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  username?: string | null;
  location?: string | null;
  skills?: string | null;
  voice_profile_url?: string | null;
}

export const updateMe = (body: UpdateMeBody) =>
  apiFetch<AuthUser>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });

async function persistAccessToken(accessToken: string): Promise<void> {
  await setToken(accessToken);
  const saved = await getToken();
  if (!saved) {
    throw new Error("SESSION_STORAGE_FAILED");
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

export async function loginWithAppleNative(identityToken: string, nonce: string) {
  const res = await apiFetch<{ access_token: string }>("/auth/apple-native", {
    method: "POST",
    body: JSON.stringify({ identity_token: identityToken, nonce }),
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
