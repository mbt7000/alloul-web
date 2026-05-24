'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Inbox, CheckCircle2, Bell, Loader2, Trash2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { apiFetch, ApiError } from '@/lib/api-client';
import { isAuthenticated, clearToken } from '@/lib/auth';

interface Notification {
  id: number; type: string; title: string; body?: string;
  read: number; created_at: string; reference_id?: string;
}

const TYPE_COLOR: Record<string, string> = {
  join_request: '#FFB24D',
  join_request_accepted: '#14E0A4',
  join_request_rejected: '#EF4444',
  company_invite: '#2E8BFF',
  follow: '#8B5CF6',
  system: '#6B7280',
  handover: '#00D4FF',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

export default function InboxPage() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'unread' | 'all'>('unread');
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    load();
  }, [router]);

  const load = async () => {
    try {
      const data = await apiFetch<Notification[]>('/notifications/');
      setNotifs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) { clearToken(); router.replace('/login'); }
    } finally { setLoading(false); }
  };

  const markRead = async (id: number) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
    } catch { }
  };

  const markAllRead = async () => {
    setMarking(true);
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      setNotifs(prev => prev.map(n => ({ ...n, read: 1 })));
    } catch { } finally { setMarking(false); }
  };

  const deleteNotif = async (id: number) => {
    try {
      await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
      setNotifs(prev => prev.filter(n => n.id !== id));
    } catch { }
  };

  const visible = tab === 'unread' ? notifs.filter(n => !n.read) : notifs;
  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <AppShell>
      <header className="sticky top-0 z-20 bg-dark-bg-900/85 backdrop-blur-xl border-b border-primary/10 px-4 py-3" dir="rtl">
        <div className="flex items-center gap-3">
          <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5 text-white/70">
            <ArrowRight size={18} />
          </Link>
          <h1 className="text-white font-black text-[17px] flex-1">الصندوق</h1>
          {unreadCount > 0 && (
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-white text-[10px] font-black">{unreadCount}</span>
            </div>
          )}
          {unreadCount > 0 && (
            <button onClick={markAllRead} disabled={marking}
              className="text-xs text-primary-400 hover:text-primary-300 font-bold px-2">
              {marking ? <Loader2 size={12} className="animate-spin" /> : 'تحديد الكل كمقروء'}
            </button>
          )}
        </div>
        {/* Tabs */}
        <div className="flex bg-white/5 rounded-full p-1 mt-3">
          {([['unread', 'غير مقروءة'], ['all', 'الكل']] as ['unread' | 'all', string][]).map(([v, label]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`flex-1 py-1.5 rounded-full text-sm font-bold transition-all ${tab === v ? 'bg-primary/20 text-primary-400' : 'text-white/40'}`}>
              {label}
              {v === 'unread' && unreadCount > 0 && (
                <span className="mr-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4 pb-24 md:pb-10" dir="rtl">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-primary" /></div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
              <Inbox size={28} className="text-white/20" />
            </div>
            <p className="text-white/40 text-sm">{tab === 'unread' ? 'لا يوجد إشعارات غير مقروءة' : 'لا يوجد إشعارات'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map(n => {
              const color = TYPE_COLOR[n.type] ?? '#6B7280';
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                    n.read ? 'border-white/5 bg-white/[0.01]' : 'border-primary/15 bg-white/[0.03] hover:bg-white/[0.05]'
                  }`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                    <Bell size={16} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-bold truncate ${n.read ? 'text-white/60' : 'text-white'}`}>{n.title}</p>
                      {!n.read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: color }} />}
                    </div>
                    {n.body && <p className="text-white/40 text-xs mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-white/25 text-[10px] mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                    className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
