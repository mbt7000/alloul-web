import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppMode, UserContext, CompanyContext, ThemeMode } from '../types';

interface AppContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  user: UserContext | null;
  activeCompany: CompanyContext | null;
  setActiveCompany: (company: CompanyContext | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>('media');
  const [theme, setTheme] = useState<ThemeMode>('official');
  const [user, setUser] = useState<UserContext | null>({
    id: '1',
    name: 'Mohamed Alloul',
    email: 'mbtalm1@gmail.com',
    avatar: 'https://picsum.photos/seed/alloul/100/100',
    role: 'admin'
  });
  const [activeCompany, setActiveCompany] = useState<CompanyContext | null>({
    id: 'c1',
    name: 'ALLOUL&Q Cloud',
    logo: 'https://picsum.photos/seed/cloud/100/100',
    role: 'CEO'
  });

  return (
    <AppContext.Provider value={{ mode, setMode, theme, setTheme, user, activeCompany, setActiveCompany }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
