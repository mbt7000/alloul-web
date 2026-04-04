# Alloul One Production Architecture Audit

## Scope
- Frontend/mobile only (`React Native + Expo`).
- Target architecture: `AppRoot/Auth/AppController/MediaApp/CompanyApp/GlobalLayer`.

## Current to Target Mapping

### AppRoot
- `App.tsx` currently hosts language sync, providers, auth gate, onboarding gate, and root navigation.
- Target split:
  - Auth flow ownership in dedicated auth navigator.
  - AppController ownership for mode selection + shell dispatch.

### Auth
- Existing:
  - `src/features/auth/screens/LoginScreen.tsx` (login + register behavior in one screen).
  - `src/features/onboarding/screens/OnboardingScreen.tsx`.
- Gap:
  - Explicit splash/register route ownership exists only implicitly in `App.tsx` gate logic.

### AppController / ModeEngine / AccessRules
- Existing:
  - `src/state/mode/HomeModeContext.tsx` provides persisted mode and company eligibility check.
  - Company access checks duplicated in `src/navigation/RootNavigator.tsx`.
- Gap:
  - No single `ModeEngine` contract with dedicated access rules and global gateways.

### MediaApp
- Existing tabs:
  - `src/navigation/MediaTabs.tsx` with `Feed/Explore/Inbox/Search/Profile`.
- Existing stacks/screens:
  - Feed/Home: `src/features/media/screens/MediaHomeScreen.tsx`, `FeedScreen.tsx`
  - Explore/Search: `ExploreScreen.tsx`, `src/features/discover/screens/DiscoverScreen.tsx`
  - Profile: `src/shared/screens/ProfileScreen.tsx` (mixed mode branches)
  - Others: `CreatePostScreen.tsx`, `CommunitiesScreen.tsx`, `JobsScreen.tsx`, `MarketplaceScreen.tsx`
- Gap:
  - Media stack ownership still mixed at root level and shares routes with company world.

### CompanyApp
- Existing tabs:
  - `src/navigation/CompaniesTabs.tsx` with `Home/Apps/Inbox/CompanyFeed/More`.
- Existing modules/screens:
  - Selector/List: `CompanyListScreen.tsx`
  - Dashboard/Home: `CompanyHomeScreen.tsx`, `CompanyWorkspaceShellScreen.tsx`
  - Services: `ServicesHubScreen.tsx`, `ApprovalsScreen.tsx`, `HandoverScreen.tsx`, `MeetingsScreen.tsx`, `CompanyFilesScreen.tsx`, `TeamScreen.tsx`, `ProjectsScreen.tsx`, `TasksScreen.tsx`, `ChatScreen.tsx`, `CRMScreen.tsx`, `ReportsScreen.tsx`, `KnowledgeScreen.tsx`
  - Workspace: `CompanyFeedScreen.tsx`, `CompanyMoreScreen.tsx`
- Gap:
  - Route ownership still mixed in a monolithic root stack.
  - `Members/Roles/InternalSearch` are not explicit company workspace routes.

### GlobalLayer
- Existing shared infra:
  - `src/state/notifications/NotificationsContext.tsx`
  - `src/shared/LanguageSync.tsx`
  - Theme/i18n/storage/api under `src/theme`, `src/i18n`, `src/storage`, `src/api`
- Gap:
  - No explicit `NotificationsGateway` / `SearchGateway` route-level dispatch.
  - Mode switcher exists in header component but not formalized as global layer contract.

## Structural Issues Found
- Cross-world route leakage via single root stack.
- Mixed ownership in shared profile/home patterns.
- Access rules duplicated between context and navigator wrappers.
- Global entry points (search/notifications) are not centralized as gateways.

## Refactor Baseline
1. Introduce isolated navigators: `AuthNavigator`, `MediaNavigator`, `CompanyNavigator`, `AppControllerNavigator`.
2. Promote mode/access contract into `ModeEngine` context API.
3. Add explicit route gateways for notifications/search.
4. Keep existing behavior stable while separating ownership boundaries.
