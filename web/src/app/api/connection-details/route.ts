import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.alloul.app';

/**
 * Proxy to the Python backend /livekit/rooms endpoint.
 * The backend enforces company isolation: room names are scoped to company_id.
 * No cross-company access is possible.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { title: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body?.title?.trim()) {
    return NextResponse.json({ error: 'title required' }, { status: 400 });
  }

  const res = await fetch(`${API_BASE}/livekit/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({ title: body.title }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  // Map backend response → frontend shape
  return NextResponse.json({
    serverUrl:        data.ws_url,
    roomName:         data.room_name,
    participantToken: data.token,
    title:            data.title,
  });
}
