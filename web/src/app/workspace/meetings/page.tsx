'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowRight, Calendar, Video, Loader2, Clock, Plus,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getMeetings, ApiError, type Meeting } from '@/lib/api-client';
import { isAuthenticated, clearToken, getToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const MeetingRoomOverlay = dynamic(() => import('./MeetingRoomOverlay'), { ssr: false });

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  scheduled:   { label: 'مجدول',  bg: '#2E8BFF22', color: '#2E8BFF' },
  in_progress: { label: 'جارٍ',   bg: '#F59E0B22', color: '#F59E0B' },
  done:        { label: 'منتهي',  bg: '#14E0A422', color: '#14E0A4' },
  cancelled:   { label: 'ملغى',   bg: '#EF444422', color: '#EF4444' },
};

interface ActiveRoom { ws_url: string; token: string; title: string; }

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings,   setMeetings]   = useState<Meeting[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [creating,   setCreating]   = useState(false);
  const [newTitle,   setNewTitle]   = useState('');
  const [showNew,    setShowNew]    = useState(false);
  const [activeRoom, setActiveRoom] = useState<ActiveRoom | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    (async () => {
      try { const d = await getMeetings(); setMeetings(Array.isArray(d) ? d : []); }
      catch (e: any) { if (e instanceof ApiError && e.status === 401) { clearToken(); router.replace('/login'); } }
      finally { setLoading(false); }
    })();
  }, [router]);

  const createRoom = async () => {
    if (!newTitle.trim()) return;
    setCreating(true); setError(null);
    try {
      // Generate a room name from the title
      const slug = newTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      const roomName = `alloul-${slug}-${Math.random().toString(36).slice(2, 8)}`;
      const userName = encodeURIComponent(newTitle.trim().slice(0, 32));

      const res = await fetch(
        `/api/connection-details?roomName=${encodeURIComponent(roomName)}&participantName=${userName}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      if (!res.ok) throw new Error('تعذّر إنشاء الغرفة');
      const data = await res.json();
      setActiveRoom({ ws_url: data.serverUrl, token: data.participantToken, title: newTitle });
      setShowNew(false); setNewTitle('');
    } catch (e: any) { setError(e?.message || 'خطأ'); }
    finally { setCreating(false); }
  };

  if (activeRoom) return <MeetingRoomOverlay room={activeRoom} onLeave={() => setActiveRoom(null)} />;

  return (
    <AppShell>
      <header className="sticky top-0 z-20 bg-dark-bg-900/85 backdrop-blur-xl border-b border-primary/10 px-4 py-3 flex items-center gap-4">
        <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <ArrowRight size={18} />
        </Link>
        <h1 className="text-white font-black text-[17px] flex-1">الاجتماعات</h1>
        <button onClick={() => { setShowNew(v => !v); setError(null); }}
          className="p-2 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors">
          <Plus size={18} className="text-primary" />
        </button>
      </header>

      <div className="px-4 py-5 pb-24 md:pb-10 space-y-5">

        {showNew && (
          <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-3">
            <p className="text-white font-bold text-sm flex items-center gap-2">
              <Video size={14} className="text-primary" /> اجتماع جديد
            </p>
            <div className="flex gap-2">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createRoom()}
                placeholder="عنوان الاجتماع..." dir="rtl"
                className="flex-1 bg-dark-bg-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-primary/40"
                autoFocus />
              <button onClick={createRoom} disabled={!newTitle.trim() || creating}
                className="px-4 py-2.5 rounded-xl bg-primary text-black text-sm font-black disabled:opacity-40 flex items-center gap-2">
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />} ابدأ
              </button>
            </div>
            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
          </div>
        )}

        {!showNew && (
          <button onClick={() => { setShowNew(true); setError(null); }}
            className="w-full p-4 rounded-2xl border border-primary/25 bg-primary/5 hover:bg-primary/8 transition-colors flex items-center gap-4 text-right">
            <div className="w-[52px] h-[52px] rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
              <Video size={22} className="text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-white font-black text-base">غرفة الفريق المباشرة</div>
              <p className="text-white/40 text-xs mt-0.5">فيديو وصوت مباشر — LiveKit</p>
            </div>
            <div className="px-4 py-2 rounded-full bg-primary text-black text-xs font-black flex-shrink-0">ابدأ الآن</div>
          </button>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-base">الاجتماعات المجدولة</h3>
            <span className="text-white/40 text-xs">{meetings.length} اجتماع</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={22} className="text-primary animate-spin" /></div>
          ) : meetings.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center">
              <Calendar size={36} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/60 text-sm font-bold">لا توجد اجتماعات مجدولة</p>
              <p className="text-white/30 text-xs mt-1">اضغط + لبدء اجتماع فوري</p>
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map(m => {
                const s = STATUS_STYLE[m.status] ?? STATUS_STYLE.scheduled;
                return (
                  <div key={m.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border"
                      style={{ background: s.bg, borderColor: `${s.color}44` }}>
                      <Calendar size={18} style={{ color: s.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm truncate mb-1">{m.title}</div>
                      <div className="flex items-center gap-3 text-white/40 text-[11px]">
                        {m.meeting_date && <span className="flex items-center gap-1"><Calendar size={10} />{m.meeting_date}</span>}
                        {m.meeting_time && <span className="flex items-center gap-1"><Clock size={10} />{m.meeting_time.slice(0, 5)}</span>}
                        {m.duration_minutes && <span>{m.duration_minutes} دقيقة</span>}
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full text-[11px] font-bold flex-shrink-0" style={{ background: s.bg, color: s.color }}>{s.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}
