/**
 * When the token is cleared (401, sign-out), multiple providers must reset.
 * api.ts emits on 401; AuthContext.signOut emits after removeToken.
 */

export type AuthSessionResetReason = "expired" | "signed_out";

type Listener = (reason: AuthSessionResetReason) => void;

const listeners = new Set<Listener>();

export function subscribeAuthSessionReset(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitAuthSessionReset(reason: AuthSessionResetReason): void {
  listeners.forEach((fn) => {
    try {
      fn(reason);
    } catch {
      /* ignore subscriber errors */
    }
  });
}
