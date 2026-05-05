'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, CheckCircle2, Clock, Loader2, AlertCircle,
  Users, Briefcase, FileText, Calendar, Repeat2,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { apiFetch, type DashboardActivityItem } from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';

const TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  task:       { icon: Briefcase,  color: '#2E8BFF', bg: 'rgba(46,139,255,0.12)' },
  handover:   { icon: Repeat2,    color: '#14E0A4', bg: 'rgba(20,224,164,0.12)' },
  meeting:    { icon: Calendar,   color: '#FFB24D', bg: 'rgba(255,178,77,0.12)' },
  member:     { icon: Users,      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  document:   { icon: FileText,   color: '#00D4FF', bg: 'rgba(0,212,255,0.12)' },
  default:    { icon: Bell,       color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
};

function getMeta(type: string) {
  return TYPE_META[type] ?? TYPE_META.default;
}

function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<DashboardActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [read, setRead] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    apiFetch<DashboardActivityItem[]>('/dashboard/activity?limit=50')
      .then(setItems)
      .catch((e) => setError(e?.message || 'تعذّر التحميل'))
      .finally(() => setLoading(false));
  }, [router]);

  const markAll = () => setRead(new Set(items.map((_, i) => i)));

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 glass-chrome px-4 py-3 flex items-center gap-3">
        <Bell size={18} className="text-accent-400" />
        <h1 className="text-white font-black text-lg flex-1">الإشعارات</h1>
        {items.length > 0 && (
          <button
            onClick={markAll}
            className="text-xs text-primary-400 font-bold hover:text-primary-300 transition-colors flex items-center gap-1"
          >
            <CheckCircle2 size={13} />
            تحديد الكل كمقروء
          </button>
        )}
      </header>

      <div className="px-4 py-4 pb-24 md:pb-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-primary animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle size={32} className="text-red-400 opacity-60" />
            <p className="text-white/40 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Bell size={40} className="text-white/10" />
            <p className="text-white/30 text-sm font-medium">لا توجد إشعارات بعد</p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="space-y-1">
            {items.map((item, idx) => {
              const meta = getMeta(item.type);
              const Icon = meta.icon;
              const isRead = read.has(idx);
              return (
                <button
                  key={idx}
                  onClick={() => setRead((prev) => new Set([...prev, idx]))}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl transition-all text-right ${
                    isRead
                      ? 'bg-white/[0.01] opacity-60'
                      : 'bg-white/[0.04] hover:bg-white/[0.07]'
                  }`}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: meta.bg, border: `1px solid ${meta.color}30` }}
                  >
                    <Icon size={16} style={{ color: meta.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${isRead ? 'text-white/50' : 'text-white font-medium'}`}>
                        {item.title}
                      </p>
                      {!isRead && (
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                          style={{ background: meta.color }}
                        />
                      )}
                    </div>
                    {item.time && (
                      <div className="flex items-center gap-1 mt-1">
                        <Clock size={10} className="text-white/30" />
                        <span className="text-white/30 text-[11px]">{timeAgo(item.time)}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
