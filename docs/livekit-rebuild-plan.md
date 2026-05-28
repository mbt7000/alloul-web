# ALLOUL&Q — LiveKit Comms Rebuild Plan

## Phase 0 ✅ DONE — Audit
- No Rocket.Chat SDK exists. Files named "RocketChat" use our own backend.
- liveroom.html = production video client (keep, improve)
- All call infra already exists and works

## Phase 1 ✅ MOSTLY DONE — LiveKit Media Engine
- LiveKit server running at wss://livekit.alloul.app
- livekit-client loaded in liveroom.html
- TODO: @livekit/react-native for mobile (Phase 6)

## Phase 2 ✅ MOSTLY DONE — Signaling
- WebSocket at /ws/{user_id} working
- call/initiate, accept, reject, end working
- TODO: 35s server-side timeout → missed status

## Phase 3 ✅ DONE — Rename + Clean Chat
- Renamed RocketChat → CompanyChat in all navigation
- CompanyNavigator, TeamMeetingsScreen, CompanyServicesScreen updated

## Phase 4 ✅ DONE — Notification Types + Routing + Expiry
- 35s auto-missed background task → call_missed notification in DB
- 48h expires_at on call push notifications + DB column
- call_* notifications routed to CallsPanel only (not main feed)
- CallsPanelScreen: call history with missed calls in red

## Phase 5 ✅ DONE — Professional UI
- UserCard: avatar + name + role badge + presence dot + actions
- TeamMeetingsScreen: uses UserCard, presence dots (online/busy/offline)
- TeamMeetingsScreen: shortcut button → CallsPanel
- Backend: /companies/members returns presence_status

## Phase 6 — Native Ringing (deferred)
- CallKit + PushKit (iOS)
- FCM ConnectionService (Android)
