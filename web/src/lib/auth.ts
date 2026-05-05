// ALLOUL&Q — web auth helpers (token storage + current user)
// Matches the mobile app's /auth/login flow exactly

const TOKEN_KEY = 'alloul_token';
const USER_KEY = 'alloul_user';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  name?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  bio?: string | null;
  verified?: number;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  is_admin?: boolean;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getCachedUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setCachedUser(user: AuthUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
