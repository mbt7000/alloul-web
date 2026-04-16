'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase, CheckSquare, Calendar, Users, Folder, BookOpen,
  TrendingUp, Video, MessageSquare, Sparkles, ArrowLeft, BarChart3, Loader2,
  Phone, UserPlus, PieChart,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import {
  getDashboardStats, getDashboardActivity,
  type DashboardStats, type DashboardActivityItem,
} from '@/lib/api-client';
import { isAuthenticated, getCachedUser } from '@/lib/auth';

const QUICK_ACTIONS = [
  { icon: Sparkles,      label: 'المساعد الذكي', color: '#8B5CF6', href: '/workspace/ai' },
  { icon: Video,         label: 'اجتماع',   color: '#14E0A4', href: '/workspace/meetings' },
  { icon: CheckSquare,   label: 'مهمة',     color: '#2E8BFF', href: '/workspace/tasks' },
  { icon: MessageSquare, label: 'دردشة',    color: '#00D4FF', href: '/messages' },
  { icon: TrendingUp,    label: 'صفقات',   color: '#FF4757', href: '/workspace/services' },
  { icon: Briefcase,     label: 'تسليم',   color: '#FFB24D', href: '/workspace/handover' },
];

const SERVICES = [
  { icon: Sparkles,    label: 'المساعد الذكي', sub: 'AI للمهام والتسليمات', color: '#8B5CF6', href: '/workspace/ai' },
  { icon: Users,       label: 'الفريق',        sub: 'الموظفون والأدوار',  color: '#A78BFA', href: '/workspace/team' },
  { icon: Folder,      label: 'المشاريع',      sub: 'كل المشاريع',        color: '#00D4FF', href: '/workspace/tasks' },
  { icon: CheckSquare, label: 'المهام',        sub: 'قائمة كاملة',        color: '#2E8BFF', href: '/workspace/tasks' },
  { icon: Calendar,    label: 'الاجتماعات',    sub: 'الجدولة والفريق',    color: '#14E0A4', href: '/workspace/meetings' },
  { icon: Phone,       label: 'المكالمات',     sub: 'صوت وفيديو',         color: '#14E0A4', href: '/workspace/calls' },
  { icon: TrendingUp,  label: 'CRM',           sub: 'إدارة الصفقات',      color: '#FFB24D', href: '/workspace/crm' },
  { icon: MessageSquare, label: 'دردشة الشركة', sub: 'قنوات وشات',        color: '#00D4FF', href: '/workspace/chat' },
  { icon: Briefcase,   label: 'التسليمات',     sub: 'handover ذكي',       color: '#FFB24D', href: '/workspace/handover' },
  { icon: BookOpen,    label: 'قاعدة المعرفة', sub: 'مستندات + بحث ذكي',  color: '#8B5CF6', href: '/workspace/knowledge' },
  { icon: UserPlus,    label: 'التوظيف',       sub: 'مرشحون ومقابلات',    color: '#14E0A4', href: '/workspace/hiring' },
  { icon: PieChart,    label: 'التقارير',      sub: 'إحصائيات الشركة',    color: '#00D4FF', href: '/workspace/reports' },
  { icon: BarChart3,   label: 'الخدمات',       sub: 'كل الخدمات',         color: '#FF4757', href: '/workspace/services' },
];

export default function WorkspacePage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<DashboardActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getCachedUser();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const [s, a] = await Promise.all([
          getDashboardStats().catch(() => null),
          getDashboardActivity(5).catch(() => [] as DashboardActivityItem[]),
        ]);
        if (mounted) {
          setStats(s);
          setActivity(Array.isArray(a) ? a : []);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  const firstName = (user?.name || user?.username || '').split(/\s+/)[0];

  return (
    <AppShell>
      <header className="sticky top-0 z-20 bg-dark-bg-900/85 backdrop-blur-xl border-b border-primary/10 px-4 py-3 flex items-center justify-between">
        <h1 className="text-white font-black text-xl">عالم الأعمال</h1>
        <Link href="/pricing" className="text-accent text-xs font-bold hover:text-accent-400">ترقية</Link>
      </header>

      <div className="px-4 py-5 space-y-6 pb-24 md:pb-10">
        {/* Greeting */}
        <div>
          <p className="text-white/50 text-xs">مرحباً،</p>
          <h2 className="text-white font-black text-2xl mt-1">{firstName || '...'} 👋</h2>
        </div>

        {/* Daily room card */}
        <button className="w-full p-4 rounded-2xl border border-primary/40 bg-primary/5 flex items-center gap-4 hover:bg-primary/10 transition-colors">
          <div className="w-13 h-13 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0" style={{ width: 52, height: 52 }}>
            <Video size={24} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-base">غرفة الشركة المباشرة</span>
              <div className="flex items-center gap-1 bg-danger/20 px-1.5 py-0.5 rounded">
                <div className="w-1 h-1 rounded-full bg-danger" />
                <span className="text-danger text-[9px] font-black">LIVE</span>
              </div>
            </div>
            <p className="text-white/50 text-xs mt-1">انضم للاجتماع المباشر فوراً</p>
          </div>
          <div className="px-4 py-2 rounded-full bg-primary text-white text-xs font-black flex-shrink-0">انضم</div>
        </button>

        {/* Quick actions */}
        <div className="flex gap-4 overflow-x-auto scrollbar-none">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.label} href={a.href} className="flex flex-col items-center gap-2 flex-shrink-0 w-[72px]">
              <div
                className="w-[58px] h-[58px] rounded-2xl flex items-center justify-center border transition-transform hover:scale-105 active:scale-95"
                style={{ background: `${a.color}20`, borderColor: `${a.color}44` }}
              >
                <a.icon size={22} style={{ color: a.color }} />
              </div>
              <span className="text-white text-[11px] font-bold text-center">{a.label}</span>
            </Link>
          ))}
        </div>

        {/* Services grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-base">الخدمات</h3>
            <button className="text-accent text-xs font-bold">عرض الكل</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {SERVICES.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-primary/30 active:scale-[0.97] transition-all text-right min-h-[118px] flex flex-col justify-between"
              >
                <div
                  className="w-[42px] h-[42px] rounded-xl flex items-center justify-center"
                  style={{ background: `${s.color}22` }}
                >
                  <s.icon size={20} style={{ color: s.color }} />
                </div>
                <div>
                  <div className="text-white font-bold text-sm">{s.label}</div>
                  <div className="text-white/40 text-[11px] mt-0.5">{s.sub}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Stats (real from API) */}
        <div>
          <h3 className="text-white font-bold text-base mb-3">نظرة عامة</h3>
          {loading ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 flex items-center justify-center">
              <Loader2 size={20} className="text-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={Users}       label="الفريق"        value={String(stats?.team_size ?? 0)}       color="#00D4FF" />
              <StatCard icon={CheckSquare} label="مهام معلقة"   value={String(stats?.pending_tasks ?? 0)}   color="#2E8BFF" />
              <StatCard icon={Briefcase}   label="تسليمات"      value={String(stats?.total_handovers ?? 0)} color="#FFB24D" />
            </div>
          )}
        </div>

        {/* Activity (real from API) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-base">آخر النشاط</h3>
            <button className="text-accent text-xs font-bold">عرض الكل</button>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
            {loading ? (
              <div className="p-10 flex items-center justify-center">
                <Loader2 size={20} className="text-primary animate-spin" />
              </div>
            ) : activity.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-sm">لا يوجد نشاط</div>
            ) : (
              activity.map((a, i, arr) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-4 ${
                    i < arr.length - 1 ? 'border-b border-white/5' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{a.title}</p>
                    {a.time && <p className="text-white/40 text-[11px] mt-0.5">{a.time}</p>}
                  </div>
                  <ArrowLeft size={14} className="text-white/40 flex-shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{ background: `${color}22` }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      <div className="text-white font-black text-2xl">{value}</div>
      <div className="text-white/40 text-[11px] mt-1">{label}</div>
    </div>
  );
}
