import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../auth/AuthContext";
import { useCompany } from "../company/CompanyContext";
import { STORAGE_KEYS } from "../../config/constants";

export type HomeAppMode = "public" | "company";

const STORAGE_KEY = STORAGE_KEYS.homeMode;

type HomeModeContextType = {
  mode: HomeAppMode;
  setMode: (m: HomeAppMode) => boolean;
  switchMode: (m: HomeAppMode) => boolean;
  hydrated: boolean;
  canUseCompanyMode: boolean;
  getLastRoute: (m: HomeAppMode) => string | undefined;
  setLastRoute: (m: HomeAppMode, routeName: string) => void;
};

const HomeModeContext = createContext<HomeModeContextType>({
  mode: "public",
  setMode: () => false,
  switchMode: () => false,
  hydrated: false,
  canUseCompanyMode: false,
  getLastRoute: () => undefined,
  setLastRoute: () => {},
});

export function HomeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<HomeAppMode>("public");
  const [hydrated, setHydrated] = useState(false);
  const [lastRoutes, setLastRoutes] = useState<Partial<Record<HomeAppMode, string>>>({
    public: "Feed",
    company: "CompanyWorkspace",
  });
  const { user } = useAuth();
  const { isMember, isActive } = useCompany();
  /** Admins (server: ADMIN_ALLOWED_EMAILS / ADMIN_USERNAMES) can open company workspace for QA without Stripe. */
  const canUseCompanyMode = (isMember && isActive) || Boolean(user?.is_admin);

  useEffect(() => {
    let on = true;
    void (async () => {
      try {
        const timeout = new Promise<string | null>((resolve) => {
          setTimeout(() => resolve(null), 2500);
        });
        const v = await Promise.race([AsyncStorage.getItem(STORAGE_KEY), timeout]);
        if (on && (v === "public" || v === "company")) setModeState(v);
      } catch {
        // ignore
      } finally {
        if (on) setHydrated(true);
      }
    })();
    return () => {
      on = false;
    };
  }, []);

  const setMode = useCallback(
    (m: HomeAppMode) => {
      if (m === "company" && !canUseCompanyMode) {
        setModeState("public");
        return false;
      }
      setModeState(m);
      void AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
      return true;
    },
    [canUseCompanyMode]
  );

  useEffect(() => {
    if (!canUseCompanyMode && mode === "company") {
      setModeState("public");
      void AsyncStorage.setItem(STORAGE_KEY, "public").catch(() => {});
    }
  }, [canUseCompanyMode, mode]);

  const setLastRoute = useCallback((m: HomeAppMode, routeName: string) => {
    setLastRoutes((prev) => (prev[m] === routeName ? prev : { ...prev, [m]: routeName }));
  }, []);

  const getLastRoute = useCallback(
    (m: HomeAppMode) => {
      const route = lastRoutes[m];
      if (m !== "company") return route;
      if (!route || route === "Home" || route === "Apps") return "CompanyWorkspace";
      return route;
    },
    [lastRoutes]
  );

  const switchMode = setMode;

  const value = useMemo(
    () => ({ mode, setMode, switchMode, hydrated, canUseCompanyMode, getLastRoute, setLastRoute }),
    [mode, setMode, switchMode, hydrated, canUseCompanyMode, getLastRoute, setLastRoute]
  );

  return <HomeModeContext.Provider value={value}>{children}</HomeModeContext.Provider>;
}

export function useHomeMode() {
  return useContext(HomeModeContext);
}
