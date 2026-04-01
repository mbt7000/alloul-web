export const ROOT_SHELL_ROUTES = {
  entry: "ShellEntry",
  media: "MediaShell",
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

export const MEDIA_TAB_ROUTES = {
  home: "Feed",
  explore: "Explore",
  inbox: "Inbox",
  search: "Search",
  profile: "Profile",
} as const;
