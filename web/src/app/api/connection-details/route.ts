import { NextRequest, NextResponse } from 'next/server';
import { AccessToken, VideoGrant } from 'livekit-server-sdk';

const LIVEKIT_API_KEY    = process.env.LIVEKIT_API_KEY    || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';
const LIVEKIT_URL        = process.env.LIVEKIT_URL        || 'wss://livekit.alloul.app';
const API_BASE           = process.env.NEXT_PUBLIC_API_URL || 'https://api.alloul.app';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const roomName       = searchParams.get('roomName');
  const participantName = searchParams.get('participantName') || 'user';

  if (!roomName) {
    return NextResponse.json({ error: 'roomName required' }, { status: 400 });
  }

  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return NextResponse.json({ error: 'LiveKit credentials not configured' }, { status: 503 });
  }

  // Verify auth token by calling Python backend
  const authHeader = request.headers.get('authorization') || '';
  let identity = participantName;

  if (authHeader.startsWith('Bearer ')) {
    try {
      const meRes = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: authHeader },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        identity = String(me.id || participantName);
      }
    } catch {
      // proceed with participantName as identity if auth check fails
    }
  }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: participantName,
    ttl: '4h',
  });

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);

  const token = await at.toJwt();

  return NextResponse.json({
    serverUrl: LIVEKIT_URL,
    roomName,
    participantToken: token,
    participantName,
  });
}
