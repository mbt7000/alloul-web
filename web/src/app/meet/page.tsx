import { redirect } from 'next/navigation';

interface Props {
  searchParams: Promise<{ room?: string; token?: string; wsUrl?: string }>;
}

export default async function MeetPage({ searchParams }: Props) {
  const params = await searchParams;
  const token  = params.token  ?? '';
  const room   = params.room   ?? '';
  const wsUrl  = params.wsUrl  ?? 'wss://livekit.alloul.app';

  if (token && room) {
    redirect(
      `/workspace/smart-meetings?room=${encodeURIComponent(room)}&token=${encodeURIComponent(token)}&wsUrl=${encodeURIComponent(wsUrl)}`
    );
  }

  redirect('/workspace/smart-meetings');
}
