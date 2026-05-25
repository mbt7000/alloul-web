'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';

interface RCSession {
  rc_token: string;
  rc_user_id: string;
  rc_url: string;
}

export default function CompanyChatPage() {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [session, setSession] = useState<RCSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    apiFetch<RCSession>('/rocketchat/token', { method: 'POST' })
      .then(setSession)
      .catch(() => setError('تعذّر فتح الشات'));
  }, [router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">جارٍ فتح الشات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <iframe
        ref={iframeRef}
        src={`${session.rc_url}/home`}
        className="flex-1 w-full border-0"
        allow="camera; microphone; fullscreen; display-capture"
        title="Rocket.Chat"
        onLoad={() => {
          try {
            iframeRef.current?.contentWindow?.postMessage(
              { externalCommand: 'login-with-token', token: session.rc_token },
              session.rc_url
            );
          } catch {}
        }}
      />
    </div>
  );
}
