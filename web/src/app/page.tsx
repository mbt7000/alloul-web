'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import StoriesBar from '@/components/StoriesBar';
import FeedPost from '@/components/FeedPost';
import LandingIntro from '@/components/LandingIntro';
import { getPosts, ApiError, type ApiPost } from '@/lib/api-client';
import { isAuthenticated, clearToken } from '@/lib/auth';
import { FEATURES } from '@/config/features';

const FEED_TABS = ['لك', 'متابَعون', 'الترند'];

function formatRelative(iso?: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `${mins}د`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}س`;
    const days = Math.floor(hrs / 24);
    return `${days}ي`;
  } catch { return ''; }
}

export default function HomePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Client-side auth check — determines landing vs feed
    const ok = isAuthenticated();
    setAuthed(ok);
    if (!ok) {
      setLoading(false);
      return;
    }

    // If Media World disabled, show empty state
    if (!FEATURES.MEDIA_WORLD) {
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const data = await getPosts(30, 0);
        if (mounted) setPosts(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (e instanceof ApiError && e.status === 401) {
          clearToken();
          setAuthed(false);
          return;
        }
        if (mounted) setError(e?.message || 'فشل تحميل المنشورات');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ─── Loading gate ─────────────────────────────────────────────────────
  if (authed === null) {
    return (
      <div className="min-h-screen bg-dark-bg-900 flex items-center justify-center">
        <Loader2 size={24} className="text-primary animate-spin" />
      </div>
    );
  }

  // ─── Not authenticated → show marketing landing ───────────────────────
  if (!authed) {
    return <LandingIntro />;
  }

  // ─── Media World disabled → show empty state ────────────────────────────
  if (!FEATURES.MEDIA_WORLD) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">قريباً...</h1>
            <p className="text-white/60">هذا القسم قيد التطوير</p>
          </div>
        </div>
      </AppShell>
    );
  }

  // ─── Authenticated → show the feed ────────────────────────────────────
  return (
    <AppShell>
      <header className="sticky top-0 z-20 bg-dark-bg-900/85 backdrop-blur-xl border-b border-primary/10">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-white font-black text-xl">الرئيسية</h1>
          <button className="p-2 rounded-full hover:bg-white/5">
            <Sparkles size={18} className="text-accent" />
          </button>
        </div>
        <div className="flex border-t border-white/5">
          {FEED_TABS.map((tab, i) => (
            <button
              key={tab}
              className={`flex-1 py-3 px-4 text-[15px] font-bold relative ${
                i === 0 ? 'text-white' : 'text-white/50 hover:bg-white/[0.03]'
              } transition-colors`}
            >
              {tab}
              {i === 0 && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-12 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </header>

      <StoriesBar />

      {/* Compose */}
      <div className="px-4 py-3 border-b border-primary/10">
        <div className="flex gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-logo flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">أنا</span>
          </div>
          <div className="flex-1">
            <input
              type="text"
              placeholder="ما الذي يحدث؟"
              className="w-full bg-transparent text-xl text-white placeholder:text-white/40 focus:outline-none py-2"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1 text-accent">
                <button className="p-2 rounded-full hover:bg-accent/10">🖼</button>
                <button className="p-2 rounded-full hover:bg-accent/10">✨</button>
                <button className="p-2 rounded-full hover:bg-accent/10">📍</button>
              </div>
              <button className="bg-gradient-primary text-white text-sm font-bold px-5 py-1.5 rounded-full shadow-glow-primary hover:shadow-glow-accent transition-all">
                نشر
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="pb-24 md:pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-white/60 text-sm mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-accent text-sm font-bold hover:underline"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-white/60 text-base font-bold mb-2">لا يوجد منشورات بعد</p>
            <p className="text-white/40 text-sm">كن أول من ينشر!</p>
          </div>
        ) : (
          posts.map((p) => (
            <FeedPost
              key={p.id}
              author={p.author_name || p.author_username || 'مستخدم'}
              handle={p.author_username || 'user'}
              verified={p.author_verified}
              time={formatRelative(p.created_at)}
              content={p.content}
              imageUrl={p.image_url ?? undefined}
              stats={{
                likes: p.likes_count,
                comments: p.comments_count,
                reposts: p.reposts_count,
              }}
              initial={(p.author_name || p.author_username || 'U').slice(0, 1)}
            />
          ))
        )}
      </div>
    </AppShell>
  );
}
