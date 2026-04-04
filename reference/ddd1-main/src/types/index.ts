export type AppMode = 'media' | 'company';
export type ThemeMode = 'official' | 'dim';

export type MediaTabId = 'home' | 'explore' | 'notifications' | 'search' | 'profile';

export type CompanyTabId = 'dashboard' | 'approvals' | 'services' | 'feed' | 'more';

export type CompanyModuleId = 
  | 'handover' 
  | 'meetings' 
  | 'files' 
  | 'teams' 
  | 'approvals' 
  | 'projects' 
  | 'tasks' 
  | 'chat' 
  | 'reports' 
  | 'crm'
  | 'ai'
  | 'career';

export interface UserContext {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'user';
  bio?: string;
  location?: string;
  stats?: {
    posts: number;
    followers: number;
    following: number;
  };
}

export interface CompanyContext {
  id: string;
  name: string;
  logo: string;
  role: string;
  verified: boolean;
}
