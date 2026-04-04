# Frontend Refactor - Audit Mapping

This document confirms the current-to-target file mapping for the assigned audit scope:
`api`, `config`, `navigation`, `state`, `shared`, `media`, and `companies`.

## API Mapping

### Core client + config bridge

| Current | Target | Notes |
| --- | --- | --- |
| `src/lib/api.ts` (`apiFetch`) | `src/api/client.ts` | Keep request/401/session-reset behavior unchanged. |
| `src/lib/api.ts` (`getToken`, `setToken`, `removeToken`) | `src/storage/token.ts` | Extract token helpers before API split (phase 2). |
| `src/lib/api.ts` (`pingApiHealth`) | `src/api/client.ts` | Health check remains no-auth. |

### Domain endpoint modules

| Current | Target | Notes |
| --- | --- | --- |
| `src/lib/api.ts` auth functions/types (`AuthUser`, `login`, `register`, `loginWithFirebase`, `loginWithAzureAd`, `getCurrentUser`) | `src/api/auth.api.ts` | Keep token set-on-login logic. |
| `src/lib/api.ts` company/workspace functions/types (`CompanyInfo`, `getMyCompany`, `getSubscriptionStatus`, `getCompanyStats`, `getCompanyMembers`, `getCompanyCandidates`, `setCompanyCandidateStatus`, `getWorkspaceAds`, `getDeals`, `getProjects`, `getDashboardStats`, `getDashboardActivity`, `getHandovers`, `getHandoverWorkItems`, `updateHandoverWorkItemStatus`, `getAgentHistory`) | `src/api/companies.api.ts` | Companies and workspace backend surface grouped together. |
| `src/lib/api.ts` media/public functions/types (`ApiPost`, `getPosts`, `getFollowingPosts`, `createPost`, `likePost`, `unlikePost`, `deletePost`, `getSavedPosts`, `getMediaJobs`, `applyToMediaJob`, `getCommunities`, `getMarketplaceCompanies`, `UserProfile`, `getUserProfile`, `followUser`, `unfollowUser`) | `src/api/media.api.ts` | Media/public/social APIs grouped together. |
| `src/lib/api.ts` notification functions/types (`NotificationItem`, `getNotifications`, `getUnreadCount`, `markRead`, `markAllNotificationsRead`) | `src/api/notifications.api.ts` | Notification calls isolated for provider/screen imports. |
| `src/lib/api.ts` search functions/types (`SearchResultItem`, `unifiedSearch`) | `src/api/search.api.ts` | Unified search isolated for discover/explore usage. |

## Config Mapping

| Current | Target | Notes |
| --- | --- | --- |
| `src/lib/apiConfig.ts` (`getApiBaseUrl`, `getApiDocsUrl`, `getApiOpenapiUrl`, `trimTrailingSlashes`) | `src/config/env.ts` | Keep Expo `extra` and `EXPO_PUBLIC_*` behavior unchanged. |
| `src/lib/apiConfig.ts` (`DEFAULT_API_BASE_URL`) | `src/config/constants.ts` | Constant can be exported from constants and imported by `env.ts`. |
| `src/navigation/routes.ts` | `src/config/routes.ts` (optional final location) | Plan allows route constants move during navigation cleanup. |

## Navigation Mapping

| Current | Target | Notes |
| --- | --- | --- |
| `src/navigation/RootStackNavigator.tsx` | `src/navigation/RootNavigator.tsx` | Preserve shell entry/media/company gating logic exactly. |
| `src/navigation/RootTabsNavigator.tsx` (`MediaTabsNavigator`) | `src/navigation/MediaTabs.tsx` | Preserve tab order/icons/badge behavior. |
| `src/navigation/RootTabsNavigator.tsx` (`CompanyTabsNavigator`) | `src/navigation/CompaniesTabs.tsx` | Preserve company tab behavior and routes. |
| `src/navigation/routes.ts` route literal types/constants | `src/navigation/types.ts` (+ optional `src/config/routes.ts`) | Split types/constants without behavior change. |
| `src/navigation/AppNavigator.tsx` | `src/navigation/AppNavigator.tsx` (no required move) | Not in scope of required split unless imports demand alignment. |
| `src/navigation/WorkspaceTabBar.tsx` | `src/navigation/WorkspaceTabBar.tsx` (no required move) | Keep as-is unless cleanup identifies dead code. |

## State Mapping

| Current | Target |
| --- | --- |
| `src/lib/AuthContext.tsx` | `src/state/auth/AuthContext.tsx` |
| `src/lib/CompanyContext.tsx` | `src/state/company/CompanyContext.tsx` |
| `src/lib/NotificationsContext.tsx` | `src/state/notifications/NotificationsContext.tsx` |
| `src/lib/HomeModeContext.tsx` | `src/state/mode/HomeModeContext.tsx` |

## Shared Mapping

### Shared UI/layout primitives

| Current | Target |
| --- | --- |
| `src/components/layout/AppHeader.tsx` | `src/shared/layout/AppHeader.tsx` |
| `src/components/layout/Screen.tsx` | `src/shared/layout/Screen.tsx` |
| `src/components/ui/AppText.tsx` | `src/shared/ui/AppText.tsx` |
| `src/components/ui/AppButton.tsx` | `src/shared/ui/AppButton.tsx` |
| `src/components/ui/AppInput.tsx` | `src/shared/ui/AppInput.tsx` |
| `src/components/ui/ListRow.tsx` | `src/shared/ui/ListRow.tsx` |
| `src/components/ui/InlineErrorRetry.tsx` | `src/shared/ui/InlineErrorRetry.tsx` |
| `src/components/ui/SegmentedControl.tsx` | `src/shared/ui/SegmentedControl.tsx` |
| `src/components/glass/GlassCard.tsx` | `src/shared/components/GlassCard.tsx` |
| `src/components/headers/SectionHeader.tsx` | `src/shared/components/SectionHeader.tsx` |
| `src/components/search/UnifiedSearchField.tsx` | `src/shared/components/UnifiedSearchField.tsx` |
| `src/components/home/HomeSmartHeader.tsx` | `src/shared/components/HomeSmartHeader.tsx` |
| `src/components/LanguageSync.tsx` | `src/shared/components/LanguageSync.tsx` |

### Shared cross-shell screens

| Current | Target |
| --- | --- |
| `src/screens/shared/ProfileScreen.tsx` | `src/shared/screens/ProfileScreen.tsx` |
| `src/screens/workspace/WorkHomeScreen.tsx` | `src/shared/screens/WorkHomeScreen.tsx` |

## Media Mapping

### Media screens

| Current | Target |
| --- | --- |
| `src/screens/media/FeedScreen.tsx` | `src/features/media/screens/FeedScreen.tsx` |
| `src/screens/media/CreatePostScreen.tsx` | `src/features/media/screens/CreatePostScreen.tsx` |
| `src/screens/media/JobsScreen.tsx` | `src/features/media/screens/JobsScreen.tsx` |
| `src/screens/media/CommunitiesScreen.tsx` | `src/features/media/screens/CommunitiesScreen.tsx` |
| `src/screens/media/MarketplaceScreen.tsx` | `src/features/media/screens/MarketplaceScreen.tsx` |
| `src/screens/media/SavedPostsScreen.tsx` | `src/features/media/screens/SavedPostsScreen.tsx` |
| `src/screens/media/ExploreScreen.tsx` | `src/features/media/screens/ExploreScreen.tsx` |

### Media components

| Current | Target |
| --- | --- |
| `src/components/media/MediaPostRow.tsx` | `src/features/media/components/MediaPostRow.tsx` |
| `src/components/home/PublicHomeSections.tsx` | `src/features/media/components/PublicHomeSections.tsx` |

## Companies Mapping

### Companies screens

| Current | Target |
| --- | --- |
| `src/screens/workspace/CompanyWorkspaceShellScreen.tsx` | `src/features/companies/screens/CompanyWorkspaceShellScreen.tsx` |
| `src/screens/workspace/ServicesHubScreen.tsx` | `src/features/companies/screens/ServicesHubScreen.tsx` |
| `src/screens/workspace/CompanyListScreen.tsx` | `src/features/companies/screens/CompanyListScreen.tsx` |
| `src/screens/workspace/CompanyFilesScreen.tsx` | `src/features/companies/screens/CompanyFilesScreen.tsx` |
| `src/screens/workspace/CompanyFeedScreen.tsx` | `src/features/companies/screens/CompanyFeedScreen.tsx` |
| `src/screens/workspace/DashboardScreen.tsx` | `src/features/companies/screens/DashboardScreen.tsx` |
| `src/screens/workspace/ProjectsScreen.tsx` | `src/features/companies/screens/ProjectsScreen.tsx` |
| `src/screens/workspace/TasksScreen.tsx` | `src/features/companies/screens/TasksScreen.tsx` |
| `src/screens/workspace/TeamScreen.tsx` | `src/features/companies/screens/TeamScreen.tsx` |
| `src/screens/workspace/CRMScreen.tsx` | `src/features/companies/screens/CRMScreen.tsx` |
| `src/screens/workspace/DealsScreen.tsx` | `src/features/companies/screens/DealsScreen.tsx` |
| `src/screens/workspace/HiringBoardScreen.tsx` | `src/features/companies/screens/HiringBoardScreen.tsx` |
| `src/screens/workspace/WorkspaceAdsScreen.tsx` | `src/features/companies/screens/WorkspaceAdsScreen.tsx` |

### Companies components

| Current | Target |
| --- | --- |
| `src/components/company/CompanyBlocks.tsx` | `src/features/companies/components/CompanyBlocks.tsx` |
| `src/components/workspace/CompanySidebar.tsx` | `src/features/companies/components/CompanySidebar.tsx` |
| `src/components/home/CompanyHomeSections.tsx` | `src/features/companies/components/CompanyHomeSections.tsx` |

## Confirmed Scope Constraints

- `backend/` remains untouched.
- `src/theme` and `src/i18n` remain in place.
- Mapping is move/extract oriented; no UX or flow redesign implied.
