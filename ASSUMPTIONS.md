# ASSUMPTIONS — Phase 3: ALLOUL&Q Enhancement

## Media World Features Removal

The ALLOUL_MASTER_PROMPT_v3 specified removing "Media World" features:
posts feed, stories, live streaming, social profiles, followers/following,
DMs, communities, marketplace, job board.

**Finding**: These social features do NOT exist in the current codebase.
The app is already a pure B2B workspace application.

**What exists (kept, not removed):**
- `DirectMessageScreen` — workspace peer-to-peer messaging (B2B utility, NOT social DM)
- `HiringBoardScreen` / `JobsScreen` / `JobApplicationsScreen` — internal HR management (NOT social job board)
- `PublicProfileScreen` — work identity profile, shows job title + company (NOT social profile)
- `WorkspaceAdsScreen` — internal workspace feature (not in main navigator)
- `PostDetail → InfoPlaceholderScreen` — already a stub/placeholder

**Decision**: Kept all above as they serve legitimate B2B workspace functions.
Documented here per ALLOUL_MASTER_PROMPT_v3 rule: "IF AMBIGUOUS — Document in ASSUMPTIONS.md".

## Pricing Update

Original prices: $24/$59/$289 (starter/pro/pro_plus)
Updated to: $30/$90/$210 (starter/pro/business) + Enterprise contact

Plan renamed: `pro_plus` → `business`

The Stripe product IDs in billing.api.ts point to the same backend
price IDs — Stripe Dashboard must be updated separately to reflect
new amounts. This is a UI/metadata update only; actual Stripe prices
require backend team action.

## Feature Flags (All Default OFF)

New features added behind feature flags in `src/config/features.ts`:
- `USE_PARENT_AUTH` — SSO via alloul-platform (requires backend migration)
- `USE_PARENT_BILLING` — Unified billing via alloul-platform (requires backend migration)
- `ALLOULAI_ASSISTANT` — AlloulAI workspace assistant (requires /agent/chat SSE endpoint)
- `AI_SALES_ASSISTANT` — CRM AI sidebar (requires /agent/sales endpoint)
- `DOCUMENT_AI` — Document RAG (requires pgvector + file upload backend)
- `WHATSAPP_INTEGRATION` — WhatsApp Business (requires whatsapp-mcp service, $99/mo add-on)
- `SMART_MEETINGS` — LiveKit meetings (requires livekit-service running on port 8500)
- `LEAD_GENERATION` — ALLOUL Automation leads (requires automation service)
- `ZATCA_INVOICES` — Tax-compliant invoices (requires /invoices backend endpoint)

## LiveKit vs Daily.co

The plan specifies replacing Daily.co with LiveKit SDK. The existing
`MeetingsScreen.tsx` imports `useCompanyDailyRoom` hook. A new
`SmartMeetingScreen.tsx` was created using LiveKit via the
`alloul-platform livekit-service` (port 8500). The Daily.co integration
in `MeetingsScreen.tsx` was NOT removed (ENHANCE, NEVER REPLACE rule)
as it serves existing meetings. The new `SmartMeetingScreen` is additive.

Full migration from Daily.co → LiveKit for all meetings can be done
in a follow-up once the LiveKit service is validated in production.

## Document AI / Lead Generation

These features were added as feature flags but no UI screens were created
(beyond the flags) as they require backend services not yet deployed.
A TODO screen placeholder approach would create dead UI; instead, they
exist as flags ready to enable when backend is ready.
