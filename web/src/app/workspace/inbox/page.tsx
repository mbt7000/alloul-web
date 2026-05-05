'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Inbox, Bell, CheckCircle2, Loader2, BellOff, Check } from 'lucide-react';
import AppShell from '@/components/AppShell';
import {
  getNotifications, markNotificationRead, markAllNotificationsRead,
  type AppNotification,
} from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';

const TYPE_COLOR: Record<string, string> = {
  task: '#2E8BFF', handover: '#FFB24D', meeting: '#14E0A4',
  deal: '#ec4899', system: '#8B5CF6', mention: '#00D4FF',
  approval: '#f97316', default: '#94a3b8',
};
const TYPE_ICON: Record<string, string> = {
  task: '✓', handover: '◈', meeting: '📅', deal: '📈',
  system: '⚙', mention: '@', approval: '✦', default: '🔔',
};

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

export default function InboxPage() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'unread' | 'all'>('unread');
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    load();
  }, [router]);

  async function load() {
    setLoading(true);
    try {
      const data = await getNotifications(50);
      setItems(data);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }

  async function handleRead(id: number) {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try { await markNotificationRead(id); } catch {}
  }

  async function handleReadAll() {
    setMarking(true);
    try {
      await markAllNotificationsRead();
      setItems(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
    setMarking(false);
  }

  const visible = tab === 'unread' ? items.filter(n => !n.read) : items;
  const unreadCount = items.filter(n => !n.read).length;

  return (
    <AppShell>
      <header className="sticky top-0 z-20 glass-chrome px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5 text-white/70">
            <ArrowRight size={18} />
          </Link>
          <Bell size={16} className="text-primary-400" />
          <h1 className="text-white font-black text-[17px] flex-1">الإشعارات</h1>
          {unreadCount > 0 && (
            <div className="w-5 h-5 rounded-full bg-danger flex items-center justify-center">
              <span className="text-white text-[10px] font-black">{unreadCount}</span>
            </div>
          )}
          {unreadCount > 0 && (
            <button
              onClick={handleReadAll}
              disabled={marking}
              className="flex items-center gap-1 text-[11px] font-bold text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50"
            >
              {marking ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              قراءة الكل
            </button>
          )}
        </div>
      </header>

      <div className="px-4 py-4 pb-24">
        {/* Tabs */}
        <div className="flex bg-white/5 rounded-full p-1 mb-5">
          {([['unread', `غير مقروء (${unreadCount})`], ['all', 'جميع الإشعارات']] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${
                tab === v ? 'bg-gradient-primary text-white' : 'text-white/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 size={24} className="text-primary animate-spin" />
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="text-center py-20 text-white/40">
            <BellOff size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">
              {tab === 'unread' ? 'كل الإشعارات مقروءة ✓' : 'لا توجد إشعارات بعد'}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {visible.map((n) => {
            const color = TYPE_COLOR[n.type] || TYPE_COLOR.default;
            const icon  = TYPE_ICON[n.type]  || TYPE_ICON.default;
            return (
              <div
                key={n.id}
                onClick={() => !n.read && handleRead(n.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  n.read
                    ? 'border-white/5 bg-white/[0.02] opacity-60'
                    : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                    style={{ background: `${color}20`, color }}
                  >
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white text-sm font-bold leading-snug">{n.title}</p>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-primary mt-1 flex-shrink-0" />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-white/55 text-xs mt-1 leading-relaxed">{n.body}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {n.actor_name && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: `${color}20`, color }}>
                          {n.actor_name}
                        </span>
                      )}
                      <span className="text-white/30 text-[10px]">{timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
