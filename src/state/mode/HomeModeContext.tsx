import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useAuth } from "../auth/AuthContext";
import { useCompany } from "../company/CompanyContext";

export type HomeAppMode = "company" | "public";

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
  mode: "company",
  setMode: () => true,
  switchMode: () => true,
  hydrated: true,
  canUseCompanyMode: false,
  getLastRoute: () => "CompanyWorkspace",
  setLastRoute: () => {},
});

export function HomeModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isMember, isActive } = useCompany();
  const canUseCompanyMode = (isMember && isActive) || Boolean(user?.is_admin);

  const setMode = useCallback((_m: HomeAppMode) => true, []);
  const switchMode = setMode;

  const getLastRoute = useCallback((_m: HomeAppMode) => "CompanyWorkspace", []);
  const setLastRoute = useCallback((_m: HomeAppMode, _routeName: string) => {}, []);

  const value = useMemo(
    () => ({
      mode: "company" as HomeAppMode,
      setMode,
      switchMode,
      hydrated: true,
      canUseCompanyMode,
      getLastRoute,
      setLastRoute,
    }),
    [setMode, switchMode, canUseCompanyMode, getLastRoute, setLastRoute]
  );

  return <HomeModeContext.Provider value={value}>{children}</HomeModeContext.Provider>;
}

export function useHomeMode() {
  return useContext(HomeModeContext);
}
