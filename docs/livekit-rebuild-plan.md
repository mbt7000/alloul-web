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

## Phase 3 — Rename + Clean Chat
- Rename RocketChatScreen → CompanyChannelsChatScreen
- Update all navigation references
- Chat system (channels + DMs) already works

## Phase 4 — Notification Types + Routing + Expiry
- Add expires_at to call notifications (48h)
- Route: call_* → calls panel only, never chat thread
- Add call_missed notification type
- CallsPanel UI (history with missed in red)

## Phase 5 — Professional UI
- UserCard unified component
- IncomingCallModal full-screen
- Improve TeamMeetingsScreen
- Improve call history

## Phase 6 — Native Ringing (deferred)
- CallKit + PushKit (iOS)
- FCM ConnectionService (Android)
