'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, BarChart3, CheckSquare, Users, Folder, TrendingUp, Calendar, Loader2,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getDashboardStats, ApiError, type DashboardStats } from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';

const TILES = [
  { key: 'tasks_total',     icon: CheckSquare, label: 'إجمالي المهام',    color: '#2E8BFF' },
  { key: 'tasks_done',      icon: CheckSquare, label: 'مكتملة',           color: '#14E0A4' },
  { key: 'projects_active', icon: Folder,      label: 'مشاريع نشطة',      color: '#00D4FF' },
  { key: 'team_members',    icon: Users,       label: 'أعضاء الفريق',     color: '#8B5CF6' },
  { key: 'deals_active',    icon: TrendingUp,  label: 'صفقات نشطة',       color: '#FFB24D' },
  { key: 'meetings_week',   icon: Calendar,    label: 'اجتماعات الأسبوع', color: '#FF4757' },
] as const;

export default function ReportsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    (async () => {
      try {
        const s = await getDashboardStats();
        setStats(s);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) router.replace('/login');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  return (
    <AppShell>
      <header className="glass-chrome sticky top-0 z-20 px-4 py-3 flex items-center gap-4">
        <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <ArrowRight size={18} />
        </Link>
        <h1 className="text-white font-black text-[17px] flex-1">التقارير</h1>
        <BarChart3 className="w-5 h-5 text-accent-500" />
      </header>

      <div className="px-4 py-5 pb-24 md:pb-10 max-w-5xl mx-auto">
        <div className="glass-strong p-6 mb-6 glass-ring-accent">
          <h2 className="text-lg font-bold mb-1">لوحة التقارير</h2>
          <p className="text-sm text-white/60">نظرة شاملة على أداء شركتك — محدَّثة لحظياً.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="text-primary-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI tiles */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {TILES.map((t) => {
                const value = (stats as unknown as Record<string, number>)?.[t.key] ?? 0;
                return (
                  <div key={t.key} className="glass glass-hover p-5">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: `${t.color}22`, border: `1px solid ${t.color}55` }}>
                      <t.icon size={20} style={{ color: t.color }} />
                    </div>
                    <p className="text-3xl font-black" style={{ color: t.color }}>{value}</p>
                    <p className="text-xs text-white/60 mt-1">{t.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Progress bars chart */}
            <div className="glass p-5 mb-6">
              <h3 className="text-white font-bold text-sm mb-4">نسب الإنجاز</h3>
              <div className="space-y-4">
                {TILES.map((t) => {
                  const value = (stats as unknown as Record<string, number>)?.[t.key] ?? 0;
                  const max = Math.max(...TILES.map(ti => (stats as any)?.[ti.key] ?? 0), 1);
                  const pct = Math.round((value / max) * 100);
                  return (
                    <div key={t.key} className="flex items-center gap-3">
                      <p className="text-white/50 text-xs w-28 flex-shrink-0 truncate">{t.label}</p>
                      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${t.color}, ${t.color}88)` }} />
                      </div>
                      <p className="text-white font-black text-sm w-8 text-left flex-shrink-0">{value}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task completion donut (CSS) */}
            {stats && (
              <div className="glass p-5">
                <h3 className="text-white font-bold text-sm mb-4">إنجاز المهام</h3>
                <div className="flex items-center gap-6">
                  <div className="relative w-24 h-24 flex-shrink-0">
                    {(() => {
                      const total = (stats as any).tasks_total ?? 0;
                      const done = (stats as any).tasks_done ?? 0;
                      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                      const r = 36; const circ = 2 * Math.PI * r;
                      const dash = (pct / 100) * circ;
                      return (
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                          <circle cx="50" cy="50" r={r} fill="none" stroke="#14E0A4" strokeWidth="10"
                            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
                            style={{ transition: 'stroke-dasharray 0.7s ease' }} />
                          <text x="50" y="54" textAnchor="middle" className="fill-white font-black"
                            style={{ fontSize: '18px', transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}>
                            {pct}%
                          </text>
                        </svg>
                      );
                    })()}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#14E0A4' }} />
                      <span className="text-white/60 text-xs">مكتملة: <strong className="text-white">{(stats as any).tasks_done ?? 0}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                      <span className="text-white/60 text-xs">متبقية: <strong className="text-white">{((stats as any).tasks_total ?? 0) - ((stats as any).tasks_done ?? 0)}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#2E8BFF' }} />
                      <span className="text-white/60 text-xs">مشاريع نشطة: <strong className="text-white">{(stats as any).projects_active ?? 0}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
