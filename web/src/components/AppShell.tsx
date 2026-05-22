'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Home, Search, Bell, MessageSquare, Bookmark, User, Briefcase,
  Plus, Menu, X, LogOut, Plug2, Settings,
} from 'lucide-react';
import { getCachedUser, clearToken, type AuthUser } from '@/lib/auth';

// ALLOUL&Q web shell — mirrors the mobile app's navigation
// Left sidebar (desktop) → mobile bottom nav equivalent
// Main column → app content (feed, profile, workspace, etc.)
// Right rail (desktop) → suggestions / trends

const NAV_ITEMS = [
  { href: '/',              icon: Home,          label: 'الرئيسية' },
  { href: '/explore',       icon: Search,        label: 'استكشاف' },
  { href: '/notifications', icon: Bell,          label: 'الإشعارات' },
  { href: '/messages',      icon: MessageSquare, label: 'الرسائل' },
  { href: '/workspace',     icon: Briefcase,     label: 'عالم الأعمال' },
  { href: '/integrations',  icon: Plug2,         label: 'الروابط' },
  { href: '/settings',      icon: Settings,      label: 'الإعدادات' },
  { href: '/profile',       icon: User,          label: 'الملف الشخصي' },
];

function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-2xl overflow-hidden shadow-glow-primary flex-shrink-0 border border-primary/20"
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

  useEffect(() => {
    setUser(getCachedUser());
  }, []);

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-dark-bg-900 text-white relative">
      {/* Background glow orbs */}
      <div className="pointer-events-none fixed top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-secondary/10 blur-[140px]" />

      {/* ─── Desktop layout: 3 columns ────────────────────────────────── */}
      <div className="max-w-[1300px] mx-auto flex">
        {/* LEFT SIDEBAR (desktop) */}
        <aside className="hidden md:flex flex-col w-[88px] lg:w-[275px] min-h-screen sticky top-0 px-3 py-4 border-l border-primary/10">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 px-3 py-3 mb-2 hover:bg-white/5 rounded-2xl transition-colors">
            <LogoMark size={40} />
            <div className="hidden lg:flex flex-col">
              <span className="text-white font-black text-base leading-none">
                ALLOUL<span className="text-secondary">&Q</span>
              </span>
              <span className="text-white/40 text-[9px] mt-1">منصة الأعمال الذكية</span>
            </div>
          </Link>

          {/* Nav */}
          <nav className="flex-1 flex flex-col gap-1 mt-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 px-4 py-3 rounded-full transition-colors ${
                    active
                      ? 'bg-primary/15 text-white border border-primary/40'
                      : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                  <span className={`hidden lg:block text-[15px] ${active ? 'font-bold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Post CTA */}
          <Link
            href="/compose"
            className="mt-4 w-full bg-gradient-primary text-white font-bold text-sm py-3 px-5 rounded-full shadow-glow-primary hover:shadow-glow-accent transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            <span className="hidden lg:inline">نشر منشور</span>
          </Link>

          {/* User card — real data */}
          {user ? (
            <button
              onClick={handleLogout}
              className="mt-4 flex items-center gap-3 px-3 py-3 rounded-full hover:bg-white/5 transition-colors w-full"
              title="تسجيل الخروج"
            >
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt={user.username} className="w-10 h-10 rounded-full flex-shrink-0 object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-logo flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">
                    {(user.name || user.username || 'U').slice(0, 1).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="hidden lg:flex flex-col flex-1 min-w-0 text-right">
                <span className="text-white text-sm font-bold truncate">{user.name || user.username}</span>
                <span className="text-white/40 text-xs truncate">@{user.username}</span>
              </div>
              <LogOut size={16} className="hidden lg:block text-white/40 flex-shrink-0" />
            </button>
          ) : (
            <Link
              href="/login"
              className="mt-4 flex items-center gap-3 px-3 py-3 rounded-full hover:bg-white/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-white/60" />
              </div>
              <span className="hidden lg:block text-white/60 text-sm">تسجيل الدخول</span>
            </Link>
          )}
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0 border-l border-primary/10 min-h-screen max-w-[600px]">
          {children}
        </main>

        {/* RIGHT RAIL (desktop lg+) */}
        <aside className="hidden lg:block w-[340px] min-h-screen sticky top-0 px-6 py-4">
          {/* Search */}
          <div className="sticky top-0 bg-dark-bg-900/85 backdrop-blur-xl pt-2 pb-3 -mt-2">
            <div className="relative">
              <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="ابحث في ALLOUL&Q"
                className="w-full bg-white/5 border border-white/10 rounded-full py-3 pr-11 pl-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07]"
              />
            </div>
          </div>

          {/* Brand promo card (no dummy data) */}
          <div className="bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 border border-primary/20 rounded-2xl mt-4 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-glow-primary">
                <Image src="/icon.png" alt="ALLOUL&Q" width={40} height={40} />
              </div>
              <div>
                <div className="text-white font-bold text-sm">ALLOUL&Q</div>
                <div className="text-white/50 text-[11px]">منصة الأعمال الذكية</div>
              </div>
            </div>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              مهام، مشاريع، اجتماعات، AI — كل شي في منصة واحدة.
            </p>
            <Link
              href="/pricing"
              className="block text-center bg-gradient-primary text-white text-sm font-bold py-2.5 rounded-full shadow-glow-primary hover:shadow-glow-accent transition-all"
            >
              الترقية
            </Link>
          </div>

          {/* Footer mini */}
          <div className="mt-4 px-4 text-[11px] text-white/40 flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/pricing" className="hover:text-white/70">الأسعار</Link>
            <Link href="/enterprise" className="hover:text-white/70">Enterprise</Link>
            <a href="#" className="hover:text-white/70">الخصوصية</a>
            <a href="#" className="hover:text-white/70">الشروط</a>
            <span>© 2026 Alloul Digital</span>
          </div>
        </aside>
      </div>

      {/* ─── MOBILE BOTTOM NAV ─────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-dark-bg-900/95 backdrop-blur-xl border-t border-primary/10">
        <div className="flex items-center justify-around h-14 px-2">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full ${
                  active ? 'text-primary' : 'text-white/60'
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile header (top) */}
      <header className="md:hidden sticky top-0 z-30 bg-dark-bg-900/90 backdrop-blur-xl border-b border-primary/10 px-4 h-14 flex items-center justify-between">
        <button onClick={() => setMobileNavOpen(true)} className="p-2 -ml-2">
          <Menu size={22} />
        </button>
        <LogoMark size={32} />
        <Link href="/notifications" className="p-2 -mr-2 relative">
          <Bell size={22} />
        </Link>
      </header>

      {/* Mobile side drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)}>
          <div
            className="absolute top-0 right-0 bottom-0 w-72 bg-dark-bg-900 border-l border-primary/10 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <LogoMark />
              <button onClick={() => setMobileNavOpen(false)} className="p-2">
                <X size={22} />
              </button>
            </div>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl ${
                      active ? 'bg-primary/15 text-white' : 'text-white/80 hover:bg-white/5'
                    }`}
                  >
                    <Icon size={20} />
                    <span className={active ? 'font-bold' : ''}>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <Link
              href="/pricing"
              onClick={() => setMobileNavOpen(false)}
              className="mt-6 block text-center bg-gradient-primary text-white font-bold text-sm py-3 rounded-full shadow-glow-primary"
            >
              الترقية
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
