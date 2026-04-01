import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getCurrentUser, type AuthUser } from "../../api";
import { getToken, removeToken } from "../../storage/token";
import { clearSessionLocalStores } from "../../storage/session";
import { emitAuthSessionReset, subscribeAuthSessionReset, type AuthSessionResetReason } from "./authInvalidation";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  sessionNotice: string | null;
  consumeSessionNotice: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const handleSessionReset = useCallback(async (reason: AuthSessionResetReason) => {
    await removeToken();
    await clearSessionLocalStores();
    setUser(null);
    if (reason === "expired") {
      setSessionNotice("Your session expired. Please sign in again.");
    } else {
      setSessionNotice(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        return;
      }
      const u = await getCurrentUser();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return subscribeAuthSessionReset((reason) => {
      void handleSessionReset(reason);
    });
  }, [handleSessionReset]);

  const signOut = useCallback(async () => {
    emitAuthSessionReset("signed_out");
  }, []);

  const consumeSessionNotice = useCallback(() => {
    setSessionNotice(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refresh, sessionNotice, consumeSessionNotice }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
