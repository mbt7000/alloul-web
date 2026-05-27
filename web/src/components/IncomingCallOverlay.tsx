'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Phone, Video, PhoneOff } from 'lucide-react';
import { useCallSocket, type IncomingCallPayload } from '@/hooks/useCallSocket';
import { apiFetch } from '@/lib/api-client';

export default function IncomingCallOverlay() {
  const [incoming, setIncoming] = useState<IncomingCallPayload | null>(null);
  const [accepting, setAccepting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pulseRef = useRef<number>(0);

  // Ringtone
  useEffect(() => {
    if (incoming) {
      try {
        const audio = new Audio('https://cdn.pixabay.com/audio/2023/01/04/audio_7eaeac5e7e.mp3');
        audio.loop = true;
        audio.volume = 0.7;
        audio.play().catch(() => {});
        audioRef.current = audio;
      } catch { /* ignore */ }
    } else {
      audioRef.current?.pause();
      audioRef.current = null;
    }
    return () => {
      audioRef.current?.pause();
    };
  }, [incoming]);

  const handleEvent = useCallback((event: any) => {
    if (event.type === 'incoming_call') {
      setIncoming(event as IncomingCallPayload);
    } else if (event.type === 'call_rejected' || event.type === 'call_ended') {
      setIncoming(null);
    }
  }, []);

  useCallSocket({ onEvent: handleEvent });

  const handleAccept = async () => {
    if (!incoming || accepting) return;
    setAccepting(true);
    try {
      const data = await apiFetch<{ call_id: number; room_name: string; token: string; ws_url: string }>(
        `/call/accept/${incoming.call_id}`, { method: 'POST' }
      );
      setIncoming(null);
      const wsUrl = data.ws_url || 'wss://livekit.alloul.app';
      let meetUrl = `/workspace/smart-meetings?room=${encodeURIComponent(data.room_name)}&token=${encodeURIComponent(data.token)}&wsUrl=${encodeURIComponent(wsUrl)}`;
      if (data.call_id) meetUrl += `&callId=${data.call_id}`;
      window.location.assign(meetUrl);
    } catch {
      setAccepting(false);
      alert('تعذّر قبول المكالمة — تحقق من الاتصال وحاول مجدداً');
    }
  };

  const handleReject = useCallback(() => {
    if (!incoming) return;
    apiFetch(`/call/reject/${incoming.call_id}`, { method: 'POST' }).catch(() => {});
    setIncoming(null);
  }, [incoming]);

  if (!incoming) return null;

  const isVideo = incoming.call_type === 'video';
  const initials = (incoming.caller_name || '?')
    .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,10,15,0.92)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Background rings */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        {[320, 240, 160].map((size, i) => (
          <div key={size} style={{
            position: 'absolute',
            width: size, height: size,
            borderRadius: '50%',
            border: `1px solid rgba(46,139,255,${0.06 + i * 0.06})`,
            animation: `callRing ${1.5 + i * 0.3}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes callRing {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes callPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>

      <div style={{ textAlign: 'center', padding: '0 40px', position: 'relative' }}>
        {/* Call type */}
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 16 }}>
          {isVideo ? 'اتصال فيديو وارد' : 'اتصال صوتي وارد'}
        </p>

        {/* Avatar */}
        <div style={{ animation: 'callPulse 1.6s ease-in-out infinite', marginBottom: 20 }}>
          <div style={{
            width: 120, height: 120, borderRadius: '50%', margin: '0 auto',
            border: '3px solid rgba(46,139,255,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(46,139,255,0.12)',
          }}>
            <span style={{ fontSize: 42, fontWeight: 700, color: '#2e8bff' }}>{initials}</span>
          </div>
        </div>

        {/* Name */}
        <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
          {incoming.caller_name}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 48 }}>
          يرن...
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 60, justifyContent: 'center', alignItems: 'center' }}>
          {/* Reject */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleReject}
              style={{
                width: 68, height: 68, borderRadius: '50%',
                background: '#EF4444', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <PhoneOff size={28} color="#fff" />
            </button>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>رفض</span>
          </div>

          {/* Accept */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleAccept}
              disabled={accepting}
              style={{
                width: 68, height: 68, borderRadius: '50%',
                background: '#22C55E', border: 'none', cursor: accepting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.15s', opacity: accepting ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!accepting) e.currentTarget.style.transform = 'scale(1.1)'; }}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {isVideo ? <Video size={28} color="#fff" /> : <Phone size={28} color="#fff" />}
            </button>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>قبول</span>
          </div>
        </div>
      </div>
    </div>
  );
}
