'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Settings, Building2, Shield, Key, LogOut,
  Loader2, Mail, Calendar, BadgeCheck, ChevronLeft,
  BarChart3, Users, Briefcase,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getCurrentUser, getDashboardStats, type DashboardStats } from '@/lib/api-client';
import { isAuthenticated, clearToken, type AuthUser } from '@/lib/auth';

const MENU_ITEMS = [
  { icon: Building2, label: 'ملف الشركة',      sub: 'الهوية والبيانات',       href: '/workspace',           color: '#00D4FF' },
  { icon: Users,     label: 'الفريق',           sub: 'الموظفون والأدوار',      href: '/workspace/team',      color: '#8B5CF6' },
  { icon: BarChart3, label: 'التقارير',          sub: 'الأداء والإحصائيات',     href: '/workspace/reports',   color: '#14E0A4' },
  { icon: Key,       label: 'الأدوار والصلاحيات', sub: 'إدارة الوصول',          href: '/workspace/services',  color: '#FFB24D' },
  { icon: Briefcase, label: 'الوظائف',           sub: 'نشر وإدارة الوظائف',    href: '/workspace/hiring',    color: '#6366F1' },
  { icon: Shield,    label: 'الأمان',            sub: 'كلمة المرور والحماية',   href: '/settings/billing',    color: '#EF4444' },
  { icon: Settings,  label: 'الإعدادات',         sub: 'الحساب والتفضيلات',      href: '/settings/billing',    color: '#64748B' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    let mounted = true;
    (async () => {
      try {
        const [me, s] = await Promise.all([
          getCurrentUser(),
          getDashboardStats().catch(() => null),
        ]);
        if (mounted) { setUser(me); setStats(s); }
      } catch {
        router.replace('/login');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 size={24} className="text-primary animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!user) return null;

  const initials = (user.name || user.username || 'U').slice(0, 2).toUpperCase();

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-dark-bg-900/85 backdrop-blur-xl border-b border-primary/10 px-4 py-3 flex items-center gap-3">
        <h1 className="text-white font-black text-lg flex-1">الملف الشخصي</h1>
        <Link href="/settings/billing" className="p-2 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-colors">
          <Settings size={18} />
        </Link>
      </header>

      <div className="px-4 py-5 space-y-5 pb-24 md:pb-10">

        {/* Profile card */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
          {/* Top gradient band */}
          <div className="h-20 bg-gradient-to-br from-primary/30 via-secondary/20 to-transparent relative">
            <div className="absolute inset-0 opacity-20"
              style={{ background: 'radial-gradient(ellipse at top right, #00D4FF44, transparent 70%)' }}
            />
          </div>

          <div className="px-4 pb-5">
            {/* Avatar overlapping the band */}
            <div className="flex items-end justify-between -mt-10 mb-3">
              <div className="w-20 h-20 rounded-2xl border-2 border-primary/40 overflow-hidden shadow-glow-primary flex-shrink-0">
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-logo flex items-center justify-center">
                    <span className="text-white font-black text-2xl">{initials}</span>
                  </div>
                )}
              </div>
              <Link
                href="/settings/billing"
                className="mb-1 px-4 py-2 rounded-xl border border-white/10 text-white/70 text-xs font-bold hover:bg-white/5 transition-colors"
              >
                تعديل الملف
              </Link>
            </div>

            {/* Name + badge */}
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-white font-black text-xl">{user.name || user.username}</h2>
              {user.verified && (
                <BadgeCheck size={18} className="text-accent flex-shrink-0" />
              )}
            </div>
            <p className="text-white/50 text-sm mb-3">@{user.username}</p>

            {/* Meta info */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-white/50">
              {user.email && (
                <span className="flex items-center gap-1">
                  <Mail size={12} /> {user.email}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar size={12} /> منذ 2026
              </span>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'أعضاء الفريق', value: stats?.team_size ?? '—', color: '#00D4FF' },
            { label: 'المهام',        value: stats?.pending_tasks ?? '—', color: '#2E8BFF' },
            { label: 'التسليمات',     value: stats?.total_handovers ?? '—', color: '#FFB24D' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-center">
              <div className="font-black text-xl" style={{ color: s.color }}>{String(s.value)}</div>
              <div className="text-white/40 text-[10px] mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Menu */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden divide-y divide-white/5">
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${item.color}18` }}>
                <item.icon size={17} style={{ color: item.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-bold">{item.label}</div>
                <div className="text-white/40 text-[11px]">{item.sub}</div>
              </div>
              <ChevronLeft size={15} className="text-white/30 flex-shrink-0" />
            </Link>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={() => { clearToken(); router.replace('/login'); }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 font-bold text-sm hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={16} />
          تسجيل الخروج
        </button>

      </div>
    </AppShell>
  );
}
