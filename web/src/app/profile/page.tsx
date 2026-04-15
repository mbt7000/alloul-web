'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Calendar, Loader2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getCurrentUser } from '@/lib/api-client';
import { isAuthenticated, type AuthUser } from '@/lib/auth';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const me = await getCurrentUser();
        if (mounted) setUser(me);
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
  const joinedYear = '2026';

  return (
    <AppShell>
      <header className="sticky top-0 z-20 bg-dark-bg-900/85 backdrop-blur-xl border-b border-primary/10 px-4 py-3 flex items-center gap-4">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <ArrowRight size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-black text-[17px] truncate">{user.name || user.username}</h1>
        </div>
      </header>

      {/* Cover */}
      <div className="h-48 bg-gradient-to-br from-primary/40 via-primary/20 to-secondary/30 relative">
        {user.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-logo opacity-30" />
        )}
        <Link
          href="/workspace"
          className="absolute top-3 right-3 flex items-center gap-2 px-3 py-2 rounded-full bg-dark-bg-900/80 border border-primary/40 backdrop-blur-sm hover:bg-dark-bg-900"
        >
          <div className="w-5 h-5 rounded-full bg-gradient-logo flex items-center justify-center">
            <span className="text-white font-bold text-[8px]">AQ</span>
          </div>
          <span className="text-white text-[11px] font-bold">التبديل للأعمال</span>
        </Link>
      </div>

      {/* Avatar + action */}
      <div className="px-4 flex items-end justify-between -mt-16 relative">
        <div className="w-32 h-32 rounded-full border-4 border-dark-bg-900 overflow-hidden shadow-glow-primary">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-logo flex items-center justify-center">
              <span className="text-white font-black text-4xl">{initials}</span>
            </div>
          )}
        </div>
        <div className="pb-3 flex gap-2">
          <Link
            href="/settings/billing"
            className="px-5 py-2 rounded-full border border-white/20 text-white font-bold text-sm hover:bg-white/5"
          >
            إعدادات الملف
          </Link>
        </div>
      </div>

      {/* Name + bio */}
      <div className="px-4 pt-3 pb-4 border-b border-primary/10">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-white font-black text-xl">{user.name || user.username}</h2>
          {user.verified ? (
            <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.866.25 1.336.25 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.356-.643.378-.022.003-.045.003-.067.003-.236 0-.463-.093-.63-.26l-2.503-2.5c-.347-.347-.347-.91 0-1.26.348-.345.91-.345 1.26 0l1.744 1.74 3.697-5.546c.272-.41.824-.52 1.233-.246.41.273.519.826.246 1.234z"/>
            </svg>
          ) : null}
        </div>
        <p className="text-white/50 text-sm mb-3">@{user.username}</p>
        {user.bio && <p className="text-white text-sm leading-relaxed mb-3">{user.bio}</p>}
        <div className="flex items-center gap-1 text-white/50 text-sm mb-3">
          <Calendar size={14} />
          انضم في {joinedYear}
        </div>
        <div className="flex items-center gap-5 text-sm">
          <div>
            <span className="text-white font-bold">{user.following_count ?? 0}</span>
            <span className="text-white/50 mr-1">يتابع</span>
          </div>
          <div>
            <span className="text-white font-bold">{user.followers_count ?? 0}</span>
            <span className="text-white/50 mr-1">متابع</span>
          </div>
        </div>
      </div>

      <div className="flex border-b border-primary/10 sticky top-[72px] bg-dark-bg-900/85 backdrop-blur-xl z-10">
        {['المنشورات', 'الردود', 'الوسائط', 'الإعجابات'].map((t, i) => (
          <button
            key={t}
            className={`flex-1 py-4 text-[14px] font-bold relative ${
              i === 0 ? 'text-white' : 'text-white/50 hover:bg-white/[0.03]'
            }`}
          >
            {t}
            {i === 0 && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-12 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="pb-24 md:pb-10 p-8 text-center">
        <p className="text-white/40 text-sm">لا توجد منشورات بعد</p>
      </div>
    </AppShell>
  );
}
