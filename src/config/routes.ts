export const ROOT_SHELL_ROUTES = {
  entry: "ShellEntry",
  company: "CompanyShell",
} as const;

export const AUTH_ROUTES = {
  login: "Login",
  register: "Register",
  onboarding: "Onboarding",
} as const;

export const GLOBAL_ROUTES = {
  notificationsGateway: "Notifications",
  searchGateway: "Discover",
  settings: "Settings",
} as const;

export const COMPANY_ROUTES = {
  selector: "CompanySelector",
  list: "Companies",
  workspace: "CompanyWorkspace",
  onboarding: "CompanyOnboarding",
  teams: "Teams",
  projects: "Projects",
  tasks: "Tasks",
  meetings: "Meetings",
  handover: "Handover",
  chat: "Chat",
  knowledge: "Knowledge",
  crm: "CRM",
  reports: "Reports",
  settings: "Settings",
  roles: "Roles",
  hiringBoard: "HiringBoard",
  jobs: "Jobs",
  notifications: "Notifications",
} as const;
