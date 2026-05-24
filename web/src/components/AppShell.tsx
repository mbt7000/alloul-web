'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Bell, Settings, User, Briefcase,
  Menu, X, LogOut, CheckSquare, Users, TrendingUp,
  MessageSquare, Phone, Calendar, BarChart3, UserPlus,
  RefreshCw, Folder, Sparkles, ChevronRight, CreditCard,
} from 'lucide-react';
import { getCachedUser, clearToken, type AuthUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';

const MAIN_NAV = [
  { href: '/workspace',     icon: LayoutDashboard, label: 'لوحة التحكم' },
  { href: '/notifications', icon: Bell,            label: 'الإشعارات' },
  { href: '/settings',      icon: Settings,        label: 'الإعدادات' },
  { href: '/profile',       icon: User,            label: 'ملفي الشخصي' },
];

const WORKSPACE_SERVICES = [
  { href: '/workspace/tasks',     icon: CheckSquare,   label: 'المهام',        color: '#2E8BFF' },
  { href: '/workspace/team',      icon: Users,         label: 'الفريق',        color: '#A78BFA' },
  { href: '/workspace/crm',       icon: TrendingUp,    label: 'CRM',           color: '#FFB24D' },
  { href: '/workspace/recruitment',    icon: UserPlus,      label: 'التوظيف',       color: '#14E0A4' },
  { href: '/workspace/meetings',  icon: Calendar,      label: 'الاجتماعات',    color: '#00D4FF' },
  { href: '/workspace/calls',     icon: Phone,         label: 'المكالمات',     color: '#14E0A4' },
  { href: '/workspace/chat',      icon: MessageSquare, label: 'الدردشة',       color: '#00D4FF' },
  { href: '/workspace/handover',  icon: RefreshCw,     label: 'التسليمات',     color: '#FFB24D' },
  { href: '/workspace/reports',   icon: BarChart3,     label: 'التقارير',      color: '#8B5CF6' },
  { href: '/workspace/ai',        icon: Sparkles,      label: 'المساعد الذكي', color: '#8B5CF6' },
];

function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-2xl overflow-hidden flex-shrink-0 border border-primary/20"
    >
      <Image src="/icon.png" alt="ALLOUL&Q" width={size} height={size} priority />
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const inWorkspace = pathname.startsWith('/workspace');

  useEffect(() => {
    setUser(getCachedUser());
  }, []);

  useEffect(() => {
    apiFetch<any[]>('/notifications/').then(data => {
      if (Array.isArray(data)) setUnreadCount(data.filter((n: any) => !n.read).length);
    }).catch(() => {});
  }, [pathname]);

  const handleLogout = () => {
    clearToken();
    document.cookie = 'alloul_auth=; path=/; max-age=0';
    router.push('/login');
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {/* Brand */}
      <Link
        href="/workspace"
        onClick={() => mobile && setMobileNavOpen(false)}
        className="flex items-center gap-3 px-3 py-3 mb-4 hover:bg-white/5 rounded-2xl transition-colors"
      >
        <div className="w-10 h-10 rounded-2xl overflow-hidden border border-primary/20 flex-shrink-0">
          <Image src="/icon.png" alt="ALLOUL&Q" width={40} height={40} />
        </div>
        <div className={`${mobile ? 'flex' : 'hidden lg:flex'} flex-col`}>
          <span className="text-white font-black text-base leading-none">
            ALLOUL<span className="text-primary">&amp;Q</span>
          </span>
          <span className="text-white/40 text-[10px] mt-0.5">منصة الأعمال الذكية</span>
        </div>
      </Link>

      {/* Main Nav */}
      <nav className="flex flex-col gap-0.5">
        {MAIN_NAV.map((item) => {
          const active = pathname === item.href || (item.href === '/workspace' && pathname === '/workspace');
          const Icon = item.icon;
          const isNotif = item.href === '/notifications';
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => mobile && setMobileNavOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative ${
                active
                  ? 'bg-primary/15 text-white border border-primary/30'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span className={`${mobile ? 'block' : 'hidden lg:block'} text-sm ${active ? 'font-bold text-white' : 'font-medium'}`}>
                {item.label}
              </span>
              {isNotif && unreadCount > 0 && (
                <span className="absolute right-2 top-2 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-black flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Workspace Services — shown when in workspace */}
      {(inWorkspace || mobile) && (
        <div className="mt-4">
          <p className={`${mobile ? 'block' : 'hidden lg:block'} text-white/30 text-[10px] font-bold uppercase tracking-widest px-3 mb-2`}>
            الخدمات
          </p>
          <div className="flex flex-col gap-0.5">
            {WORKSPACE_SERVICES.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => mobile && setMobileNavOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                    active
                      ? 'bg-white/8 text-white'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                  }`}
                >
                  <Icon size={15} style={{ color: active ? item.color : undefined }} />
                  <span className={`${mobile ? 'block' : 'hidden lg:block'} text-xs ${active ? 'font-bold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                  {active && <ChevronRight size={12} className="hidden lg:block mr-auto text-white/30" />}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Billing — owner only */}
      {user?.account_type === 'owner' && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <Link
            href="/billing"
            onClick={() => mobile && setMobileNavOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              pathname === '/billing'
                ? 'bg-primary/15 text-white border border-primary/30'
                : 'text-white/50 hover:bg-white/5 hover:text-white/80'
            }`}
          >
            <CreditCard size={16} style={{ color: pathname === '/billing' ? '#14E0A4' : undefined }} />
            <span className={`${mobile ? 'block' : 'hidden lg:block'} text-xs font-medium`}>
              الاشتراك والفواتير
            </span>
          </Link>
        </div>
      )}

      {/* User card */}
      <div className={`${mobile ? 'mt-6' : 'mt-auto pt-4'} border-t border-white/5`}>
        {user ? (
          <div className={`${mobile ? 'flex' : 'flex'} items-center gap-3 px-3 py-3 rounded-xl`}>
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt={user.username} className="w-9 h-9 rounded-full flex-shrink-0 object-cover border border-white/10" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center flex-shrink-0 border border-white/10">
                <span className="text-white font-bold text-sm">
                  {(user.name || user.username || 'U').slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}
            <div className={`${mobile ? 'flex' : 'hidden lg:flex'} flex-col flex-1 min-w-0`}>
              <span className="text-white text-sm font-bold truncate">{user.name || user.username}</span>
              <span className="text-white/40 text-xs truncate">@{user.username}</span>
            </div>
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className={`${mobile ? 'flex' : 'hidden lg:flex'} p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all`}
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            onClick={() => mobile && setMobileNavOpen(false)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-white/60" />
            </div>
            <span className={`${mobile ? 'block' : 'hidden lg:block'} text-white/60 text-sm`}>تسجيل الدخول</span>
          </Link>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-dark-bg-900 text-white relative" dir="rtl">
      {/* Background orbs */}
      <div className="pointer-events-none fixed top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/8 blur-[130px]" />
      <div className="pointer-events-none fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-secondary/6 blur-[150px]" />

      {/* Desktop 3-column layout */}
      <div className="max-w-[1400px] mx-auto flex" dir="rtl">

        {/* RIGHT SIDEBAR (desktop) — navigation (RTL: right side) */}
        <aside className="hidden md:flex flex-col w-[72px] lg:w-[260px] min-h-screen sticky top-0 px-2 py-4 border-l border-white/5 flex-shrink-0">
          <SidebarContent />
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0 border-l border-white/5 min-h-screen">
          {children}
        </main>

        {/* LEFT RAIL (desktop lg+) */}
        <aside className="hidden lg:flex flex-col w-[300px] min-h-screen sticky top-0 px-4 py-4 flex-shrink-0">
          {/* Company quick stats */}
          <div className="glass rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase size={14} className="text-primary" />
              <span className="text-white font-bold text-sm">عالم الأعمال</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'المهام', href: '/workspace/tasks', color: '#2E8BFF' },
                { label: 'الصفقات', href: '/workspace/crm', color: '#FFB24D' },
                { label: 'التوظيف', href: '/workspace/recruitment', color: '#14E0A4' },
                { label: 'التقارير', href: '/workspace/reports', color: '#8B5CF6' },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all text-center">
                  <p className="text-xs font-bold" style={{ color: item.color }}>{item.label}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Upgrade / Billing card */}
          <div className="rounded-2xl p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(46,139,255,0.08))', border: '1px solid rgba(0,212,255,0.15)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl overflow-hidden">
                <Image src="/icon.png" alt="ALLOUL&Q" width={32} height={32} />
              </div>
              <div>
                <p className="text-white font-bold text-xs">ALLOUL&amp;Q Pro</p>
                <p className="text-white/40 text-[10px]">منصة الأعمال الذكية</p>
              </div>
            </div>
            <p className="text-white/50 text-[11px] leading-relaxed mb-3">
              مهام، مشاريع، اجتماعات، وذكاء اصطناعي — كل شيء في منصة واحدة.
            </p>
            {user?.account_type === 'owner' ? (
              <Link href="/billing"
                className="flex items-center justify-center gap-1.5 text-white text-xs font-bold py-2 rounded-xl transition-all"
                style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)' }}>
                <CreditCard size={12} />
                إدارة الاشتراك
              </Link>
            ) : (
              <Link href="/subscribe"
                className="block text-center text-white text-xs font-bold py-2 rounded-xl transition-all"
                style={{ background: 'linear-gradient(90deg,#00D4FF,#2E8BFF)' }}>
                ترقية الخطة
              </Link>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto text-[11px] text-white/25 flex flex-wrap gap-x-2 gap-y-1">
            <Link href="/pricing" className="hover:text-white/50">الأسعار</Link>
            <span>·</span>
            <Link href="/enterprise" className="hover:text-white/50">Enterprise</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-white/50">الخصوصية</Link>
            <span>·</span>
            <span>© 2026 Alloul Digital</span>
          </div>
        </aside>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-dark-bg-900/95 backdrop-blur-xl border-t border-white/8">
        <div className="flex items-center justify-around h-14 px-1">
          {[
            { href: '/workspace', icon: LayoutDashboard, label: 'الرئيسية' },
            { href: '/workspace/tasks', icon: CheckSquare, label: 'مهام' },
            { href: '/notifications', icon: Bell, label: 'إشعارات' },
            { href: '/workspace/team', icon: Users, label: 'الفريق' },
            { href: '/settings', icon: Settings, label: 'إعدادات' },
          ].map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                  active ? 'text-primary' : 'text-white/40'
                }`}>
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className="text-[9px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-30 bg-dark-bg-900/92 backdrop-blur-xl border-b border-white/8 px-4 h-14 flex items-center justify-between">
        <button onClick={() => setMobileNavOpen(true)} className="p-2 -mr-2 text-white/70">
          <Menu size={22} />
        </button>
        <Link href="/workspace">
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-primary/20">
            <Image src="/icon.png" alt="ALLOUL&Q" width={32} height={32} />
          </div>
        </Link>
        <Link href="/notifications" className="p-2 -ml-2 relative text-white/70">
          <Bell size={22} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 left-1.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] text-white font-black flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Link>
      </header>

      {/* Mobile side drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)}>
          <div
            className="absolute top-0 right-0 bottom-0 w-[280px] bg-dark-bg-900 border-l border-white/8 p-4 flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setMobileNavOpen(false)} className="p-2 text-white/50">
                <X size={20} />
              </button>
            </div>
            <SidebarContent mobile />
          </div>
        </div>
      )}
    </div>
  );
}
