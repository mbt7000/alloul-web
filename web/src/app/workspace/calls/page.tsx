'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Video, Loader2,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getCallHistory, apiFetch, ApiError, type CallHistoryItem } from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';

function formatDuration(s?: number | null) {
  if (!s || s < 1) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}د ${sec}ث` : `${sec}ث`;
}

function statusIcon(status?: string | null) {
  switch (status) {
    case 'missed':    return { Icon: PhoneMissed,    color: '#FF4757' };
    case 'incoming':  return { Icon: PhoneIncoming,  color: '#14E0A4' };
    case 'outgoing':  return { Icon: PhoneOutgoing,  color: '#2E8BFF' };
    default:          return { Icon: PhoneCall,      color: '#00D4FF' };
  }
}

export default function CallsPage() {
  const router = useRouter();
  const [calls, setCalls] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    (async () => {
      try {
        const data = await getCallHistory();
        setCalls(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) router.replace('/login');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const startCompanyCall = async () => {
    setJoining(true);
    try {
      const data = await apiFetch<{ room_name: string; token: string; ws_url: string; title: string }>(
        '/livekit/rooms', { method: 'POST', body: JSON.stringify({ title: 'غرفة الشركة المباشرة' }) }
      );
      const url = `/workspace/smart-meetings?room=${encodeURIComponent(data.room_name)}&token=${encodeURIComponent(data.token)}&wsUrl=${encodeURIComponent(data.ws_url)}`;
      window.location.href = url;
    } catch {
      alert('تعذّر بدء المكالمة — تأكد من الاتصال بالسيرفر.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <AppShell>
      <header className="glass-chrome sticky top-0 z-20 px-4 py-3 flex items-center gap-4">
        <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <ArrowRight size={18} />
        </Link>
        <h1 className="text-white font-black text-[17px] flex-1">المكالمات</h1>
        <button
          onClick={startCompanyCall}
          disabled={joining}
          className="glass-subtle glass-hover gap-2 text-secondary-500 border-secondary-500/30"
        >
          {joining ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
          <span>بدء اجتماع</span>
        </button>
      </header>

      <div className="px-4 py-5 pb-24 md:pb-10 max-w-3xl mx-auto">
        {/* Hero action card */}
        <div className="glass-strong p-6 mb-6 glass-ring-secondary">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary-500 to-secondary-700 flex items-center justify-center shadow-glow-secondary">
              <PhoneCall className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-base">مكالمات فريق الشركة</h2>
              <p className="text-white/60 text-sm">غرفة واحدة لكل الفريق — صوت + فيديو + شات</p>
            </div>
            <button
              onClick={startCompanyCall}
              disabled={joining}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-secondary-500 to-secondary-600 text-dark-bg-900 font-bold text-sm disabled:opacity-50"
            >
              {joining ? '...' : 'انضم'}
            </button>
          </div>
        </div>

        <h3 className="text-sm font-bold text-white/60 mb-3 px-1">السجل</h3>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="text-primary-500 animate-spin" />
          </div>
        ) : calls.length === 0 ? (
          <div className="glass p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center">
              <Phone size={28} className="text-primary-500" />
            </div>
            <p className="text-white/70 font-bold mb-2">لا يوجد مكالمات</p>
            <p className="text-white/40 text-sm">مكالماتك مع الفريق بتظهر هنا</p>
          </div>
        ) : (
          <div className="space-y-2">
            {calls.map((c) => {
              const { Icon, color } = statusIcon(c.status);
              return (
                <div key={c.id} className="glass glass-hover p-4 flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}22`, borderColor: `${color}55`, borderWidth: 1 }}
                  >
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">
                      {c.call_type === 'video' ? '📹 فيديو' : '🎙️ صوت'} · {c.status ?? 'ended'}
                    </p>
                    <p className="text-xs text-white/50">
                      {c.started_at ? new Date(c.started_at).toLocaleString('ar') : '—'} · {formatDuration(c.duration_seconds)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
