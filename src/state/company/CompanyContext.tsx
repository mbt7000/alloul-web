import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getMyCompany, getSubscriptionStatus, type CompanyInfo } from "../../api";
import { useAuth } from "../auth/AuthContext";

interface CompanyContextType {
  company: CompanyInfo | null;
  isMember: boolean;
  isActive: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType>({
  company: null,
  isMember: false,
  isActive: false,
  loading: true,
  refresh: async () => {},
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setCompany(null);
      setIsActive(false);
      setLoading(false);
      return;
    }
    try {
      // Guard app boot from infinite loading when backend/API is slow.
      const fallback = { company: null as CompanyInfo | null, status: null as string | null };
      const bootData = await Promise.race([
        Promise.all([getMyCompany(), getSubscriptionStatus()]).then(([c, sub]) => ({ company: c, status: sub.status })),
        new Promise<typeof fallback>((resolve) => {
          setTimeout(() => resolve(fallback), 9000);
        }),
      ]);
      const c = bootData.company;
      const status = bootData.status;
      setCompany(c);
      setIsActive(status === "active" || status === "trialing");
    } catch {
      setCompany(null);
      setIsActive(false);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <CompanyContext.Provider value={{ company, isMember: !!company, isActive, loading, refresh }}>{children}</CompanyContext.Provider>;
}

export const useCompany = () => useContext(CompanyContext);
