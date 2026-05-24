'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, Loader2, Check, X, CheckCheck, Building2,
  User, Briefcase, MessageSquare, Star, Info, Trash2,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { apiFetch } from '@/lib/api-client';
import { isAuthenticated, clearToken } from '@/lib/auth';

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  reference_id: string | null;
  actor_id: number | null;
  actor_name: string | null;
  actor_avatar: string | null;
  created_at: string | null;
}

const TYPE_ICON: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  company_invite: { icon: <Building2 size={16} />, color: '#14E0A4', bg: 'rgba(20,224,164,0.15)' },
  task:           { icon: <Briefcase size={16} />, color: '#2E8BFF', bg: 'rgba(46,139,255,0.15)' },
  message:        { icon: <MessageSquare size={16} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  like:           { icon: <Star size={16} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  mention:        { icon: <User size={16} />, color: '#A78BFA', bg: 'rgba(167,139,250,0.15)' },
};

function getStyle(type: string) {
  return TYPE_ICON[type] ?? { icon: <Info size={16} />, color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)' };
}

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `منذ ${d} يوم`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifs, setNotifs]       = useState<Notification[]>([]);
  const [loading, setLoading]     = useState(true);
  const [acting, setActing]       = useState<Record<number, 'accept' | 'reject' | 'delete'>>({});
  const [done, setDone]           = useState<Record<number, 'accepted' | 'rejected'>>({});

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    (async () => {
      try {
        const data = await apiFetch('/notifications/');
        setNotifs(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (e?.status === 401) { clearToken(); router.replace('/login'); }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const markRead = async (id: number) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const deleteNotif = async (id: number) => {
    setActing(p => ({ ...p, [id]: 'delete' }));
    try {
      await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
      setNotifs(prev => prev.filter(n => n.id !== id));
    } catch {}
    setActing(p => { const c = { ...p }; delete c[id]; return c; });
  };

  const handleInvite = async (notif: Notification, action: 'accept' | 'reject') => {
    if (!notif.reference_id) return;
    setActing(p => ({ ...p, [notif.id]: action }));
    try {
      await apiFetch(`/companies/invitations/${notif.reference_id}/${action}`, { method: 'POST' });
      setDone(p => ({ ...p, [notif.id]: action === 'accept' ? 'accepted' : 'rejected' }));
      await markRead(notif.id);
    } catch (e: any) {
      alert(e?.detail || e?.message || 'حدث خطأ');
    }
    setActing(p => { const c = { ...p }; delete c[notif.id]; return c; });
  };

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <AppShell>
      <header
        className="sticky top-0 z-20 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(7,11,20,0.85)' }}
      >
        <Bell size={18} className="text-yellow-400" />
        <h1 className="text-white font-black text-[17px] flex-1">الإشعارات</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}
          >
            <CheckCheck size={13} /> قراءة الكل
          </button>
        )}
        {unreadCount > 0 && (
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
            style={{ background: '#F59E0B', color: '#050810' }}
          >
            {unreadCount}
          </span>
        )}
      </header>

      <div className="px-4 py-4 pb-24 md:pb-10 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-primary animate-spin" />
          </div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <Bell size={28} className="text-yellow-400/50" />
            </div>
            <p className="text-white/50 text-sm font-bold">لا توجد إشعارات</p>
            <p className="text-white/25 text-xs">ستظهر هنا إشعارات المهام والدعوات والرسائل</p>
          </div>
        ) : (
          notifs.map(notif => {
            const style = getStyle(notif.type);
            const isInvite = notif.type === 'company_invite';
            const result = done[notif.id];
            const busy = acting[notif.id];

            return (
              <div
                key={notif.id}
                onClick={() => !notif.read && markRead(notif.id)}
                className="rounded-2xl p-4 transition-all cursor-pointer group relative"
                style={{
                  background: notif.read ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.045)',
                  border: `1px solid ${notif.read ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: style.bg, color: style.color }}
                  >
                    {style.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white text-sm font-bold leading-snug">{notif.title}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-white/30 text-[11px]">{timeAgo(notif.created_at)}</span>
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#14E0A4' }} />
                        )}
                      </div>
                    </div>
                    {notif.body && (
                      <p className="text-white/45 text-xs mt-0.5 leading-relaxed">{notif.body}</p>
                    )}
                    {notif.actor_name && (
                      <p className="text-white/30 text-[11px] mt-1">بواسطة: {notif.actor_name}</p>
                    )}

                    {/* Company invite actions */}
                    {isInvite && !result && (
                      <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleInvite(notif, 'accept')}
                          disabled={!!busy}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-50"
                          style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)', color: '#050810' }}
                        >
                          {busy === 'accept'
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Check size={13} />
                          }
                          قبول
                        </button>
                        <button
                          onClick={() => handleInvite(notif, 'reject')}
                          disabled={!!busy}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171' }}
                        >
                          {busy === 'reject'
                            ? <Loader2 size={13} className="animate-spin" />
                            : <X size={13} />
                          }
                          رفض
                        </button>
                      </div>
                    )}

                    {/* Result badge */}
                    {isInvite && result && (
                      <div className="mt-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                          style={
                            result === 'accepted'
                              ? { background: 'rgba(20,224,164,0.12)', color: '#14E0A4', border: '1px solid rgba(20,224,164,0.25)' }
                              : { background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }
                          }
                        >
                          {result === 'accepted' ? <><Check size={12} /> تم القبول</> : <><X size={12} /> تم الرفض</>}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={e => { e.stopPropagation(); deleteNotif(notif.id); }}
                    disabled={!!acting[notif.id]}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all flex-shrink-0 mt-0.5"
                    style={{ color: '#6B7280' }}
                  >
                    {acting[notif.id] === 'delete'
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Trash2 size={13} />
                    }
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
