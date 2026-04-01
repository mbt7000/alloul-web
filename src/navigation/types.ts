import { MEDIA_TAB_ROUTES, ROOT_SHELL_ROUTES } from "../config/routes";

export { MEDIA_TAB_ROUTES, ROOT_SHELL_ROUTES };

export type MediaTabsParamList = {
  [MEDIA_TAB_ROUTES.home]: undefined;
  [MEDIA_TAB_ROUTES.explore]: undefined;
  [MEDIA_TAB_ROUTES.inbox]: undefined;
  [MEDIA_TAB_ROUTES.search]: undefined;
  [MEDIA_TAB_ROUTES.profile]: undefined;
};

export type RootStackParamList = {
  [ROOT_SHELL_ROUTES.entry]: undefined;
  [ROOT_SHELL_ROUTES.media]: undefined;
  [ROOT_SHELL_ROUTES.company]: undefined;
  CompanyWorkspace: undefined;
  Teams: undefined;
  Projects: undefined;
  Tasks: undefined;
  Meetings: undefined;
  Handover: undefined;
  Chat: undefined;
  Knowledge: undefined;
  CRM: undefined;
  Reports: undefined;
  Notifications: undefined;
  Settings: undefined;
  ApprovalDetail: undefined;
  CreatePost: undefined;
  Discover: { q?: string; scope?: string; source?: string } | undefined;
  Companies: undefined;
  Company: undefined;
  CompanyFeed: undefined;
  CompanyFiles: undefined;
  Jobs: undefined;
  HiringBoard: undefined;
};
