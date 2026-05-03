'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Lock, Mail, Loader2, AlertCircle, User as UserIcon,
  Sparkles, CheckSquare, Users, TrendingUp, Calendar, MessageSquare,
  Zap, Shield, Globe, ArrowLeft,
} from 'lucide-react';
import { login, register, loginWithFirebase, getCurrentUser } from '@/lib/api-client';
import { setToken, setCachedUser, isAuthenticated } from '@/lib/auth';
import { signInWithGoogle, signInWithApple, getOAuthRedirectResult } from '@/lib/firebase';

type Mode = 'login' | 'register';
type OAuthProvider = 'google' | 'apple' | null;

const FEATURES = [
  { icon: Sparkles,      label: 'مساعد AI',      sub: 'تلخيص + تحليل',  color: 'oklch(65% .24 290)', bg: 'oklch(65% .24 290 / .12)', bd: 'oklch(65% .24 290 / .25)' },
  { icon: CheckSquare,   label: 'مهام ومشاريع',  sub: 'تنظيم كامل',     color: 'oklch(78% .2 200)',  bg: 'oklch(78% .2 200 / .12)',  bd: 'oklch(78% .2 200 / .25)'  },
  { icon: TrendingUp,    label: 'CRM وصفقات',    sub: 'خط أنابيب ذكي',  color: 'oklch(80% .18 75)',  bg: 'oklch(80% .18 75 / .12)',  bd: 'oklch(80% .18 75 / .25)'  },
  { icon: Calendar,      label: 'اجتماعات',       sub: 'جدولة ذكية',     color: 'oklch(72% .2 155)',  bg: 'oklch(72% .2 155 / .12)',  bd: 'oklch(72% .2 155 / .25)'  },
  { icon: Users,         label: 'فريق العمل',    sub: 'أدوار وصلاحيات', color: 'oklch(78% .2 200)',  bg: 'oklch(78% .2 200 / .12)',  bd: 'oklch(78% .2 200 / .25)'  },
  { icon: MessageSquare, label: 'تواصل داخلي',   sub: 'شات + مكالمات',  color: 'oklch(64% .24 25)',  bg: 'oklch(64% .24 25 / .12)',  bd: 'oklch(64% .24 25 / .25)'  },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated()) { router.replace('/'); return; }
    getOAuthRedirectResult().then(async (idToken) => {
      if (!idToken) return;
      setOauthLoading('google');
      try {
        const res = await loginWithFirebase(idToken);
        const isNew = !!(res as any)?.is_new_user;
        await finishLogin(res.access_token, isNew);
      } catch (err: any) {
        setError(err?.message || 'فشل الدخول عبر OAuth');
        setOauthLoading(null);
      }
    }).catch(() => {});
  }, [router]);

  const finishLogin = async (accessToken: string, isNewUser = false) => {
    setToken(accessToken);
    const me = await getCurrentUser();
    setCachedUser(me);
    router.replace(isNewUser ? '/onboarding' : '/');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const isRegister = mode === 'register';
      const res = isRegister
        ? await register(username.trim(), email.trim(), password)
        : await login(email.trim(), password);
      await finishLogin(res.access_token, isRegister);
    } catch (err: any) {
      const msg = err?.message || '';
      const isDbError = msg.toLowerCase().includes('database') || (err?.status === 503);
      setError(
        isDbError
          ? 'الخادم تحت الصيانة مؤقتاً، يرجى المحاولة بعد قليل'
          : msg || (mode === 'login' ? 'البريد أو كلمة المرور غير صحيحة' : 'فشل إنشاء الحساب، ربما البريد مستخدم مسبقاً')
      );
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setError(null);
    setOauthLoading(provider);
    try {
      const fn = provider === 'google' ? signInWithGoogle : signInWithApple;
      const idToken = await fn();
      if (!idToken) return;
      const res = await loginWithFirebase(idToken);
      const isNew = !!(res as any)?.is_new_user;
      await finishLogin(res.access_token, isNew);
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // cancelled
      } else if (msg.includes('unauthorized-domain') || code === 'auth/unauthorized-domain') {
        setError('يرجى تفعيل النطاق في Firebase Console أو استخدم البريد الإلكتروني');
      } else {
        setError(msg || 'فشل الدخول عبر OAuth');
      }
      setOauthLoading(null);
    }
  };

  const busy = loading || oauthLoading !== null;

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: '#07090f',
        fontFamily: "'Cairo', -apple-system, sans-serif",
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ── Background Mesh ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {/* Large ambient orb — top-left */}
        <div style={{
          position: 'absolute', top: '-15%', right: '-5%',
          width: '55vw', height: '55vw', maxWidth: 700, maxHeight: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(78% .2 200 / .13) 0%, transparent 70%)',
          filter: 'blur(1px)',
        }} />
        {/* Accent orb — bottom-right */}
        <div style={{
          position: 'absolute', bottom: '-20%', left: '-10%',
          width: '60vw', height: '60vw', maxWidth: 800, maxHeight: 800,
          borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(65% .24 290 / .10) 0%, transparent 70%)',
        }} />
        {/* Center glow */}
        <div style={{
          position: 'absolute', top: '35%', left: '35%',
          width: '30vw', height: '30vw', maxWidth: 400, maxHeight: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(72% .2 155 / .06) 0%, transparent 70%)',
        }} />
        {/* Fine grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }} />
      </div>

      {/* ── Layout ── */}
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1280,
        margin: '0 auto',
        padding: 'clamp(24px, 4vw, 60px) clamp(16px, 3vw, 48px)',
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,460px)',
        gap: 'clamp(32px, 4vw, 64px)',
        alignItems: 'center',
      }}
      className="login-grid"
      >

        {/* ══════════════════════════════════════
            LEFT — Brand + Features
        ══════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              overflow: 'hidden',
              border: '1px solid oklch(78% .2 200 / .3)',
              boxShadow: '0 0 24px oklch(78% .2 200 / .2)',
              flexShrink: 0,
            }}>
              <Image src="/icon.png" alt="ALLOUL&Q" width={48} height={48} priority />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: -0.5, lineHeight: 1 }}>
                ALLOUL<span style={{ color: 'oklch(78% .2 200)' }}>&Q</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 3 }}>منصة الأعمال الذكية</div>
            </div>
          </div>

          {/* AI Badge */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              fontSize: 11, fontWeight: 700,
              color: 'oklch(65% .24 290)',
              background: 'oklch(65% .24 290 / .1)',
              border: '1px solid oklch(65% .24 290 / .3)',
              borderRadius: 100, padding: '5px 13px',
              width: 'fit-content',
            }}>
              <Sparkles size={12} />
              مدعوم بـ ALLOUL Agent الخاص
            </div>

            {/* Headline */}
            <div>
              <h1 style={{
                fontSize: 'clamp(34px, 4.5vw, 58px)',
                fontWeight: 900,
                lineHeight: 1.18,
                letterSpacing: -1,
                color: '#fff',
                margin: 0,
              }}>
                مساحة عمل واحدة
              </h1>
              <h1 style={{
                fontSize: 'clamp(34px, 4.5vw, 58px)',
                fontWeight: 900,
                lineHeight: 1.18,
                letterSpacing: -1,
                margin: 0,
                background: 'linear-gradient(135deg, oklch(78% .2 200) 0%, oklch(72% .2 155) 50%, oklch(65% .24 290) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                لكل شيء تحتاجه شركتك
              </h1>
            </div>

            <p style={{
              fontSize: 'clamp(13px, 1.2vw, 16px)',
              color: 'rgba(255,255,255,.55)',
              lineHeight: 1.75,
              maxWidth: 480,
              margin: 0,
            }}>
              مهام، مشاريع، اجتماعات، CRM، مكالمات، وتسليمات ذكية — كلها في تطبيق واحد.
            </p>
          </div>

          {/* Features Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
          }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 15px',
                background: 'rgba(255,255,255,.033)',
                border: '1px solid rgba(255,255,255,.07)',
                borderRadius: 14,
                transition: 'all .2s',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.055)';
                (e.currentTarget as HTMLElement).style.borderColor = f.bd;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.033)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.07)';
              }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: f.bg, border: `1px solid ${f.bd}`,
                }}>
                  <f.icon size={16} style={{ color: f.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { icon: <Shield size={11} />, text: 'بيانات مشفّرة',    color: 'oklch(72% .2 155)' },
              { icon: <Zap size={11} />,    text: 'تجربة مجانية 14 يوم', color: 'oklch(80% .18 75)' },
              { icon: <Globe size={11} />,  text: 'عربي + إنجليزي',   color: 'oklch(78% .2 200)' },
            ].map((b, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 11, fontWeight: 700,
                color: b.color,
                background: `color-mix(in oklch, ${b.color} 10%, transparent)`,
                border: `1px solid color-mix(in oklch, ${b.color} 25%, transparent)`,
                borderRadius: 100, padding: '5px 12px',
              }}>
                {b.icon}
                {b.text}
              </div>
            ))}
          </div>

        </div>

        {/* ══════════════════════════════════════
            RIGHT — Auth Card
        ══════════════════════════════════════ */}
        <div style={{
          background: 'rgba(255,255,255,.042)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255,255,255,.09)',
          borderRadius: 24,
          padding: 'clamp(24px, 3vw, 36px)',
          boxShadow: '0 32px 80px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.08)',
        }}>

          {/* Tab Switcher */}
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,.3)',
            borderRadius: 12,
            padding: 4,
            marginBottom: 28,
            border: '1px solid rgba(255,255,255,.06)',
          }}>
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                style={{
                  flex: 1, padding: '9px 0',
                  borderRadius: 9,
                  fontSize: 13, fontWeight: 800,
                  border: 'none', cursor: 'pointer',
                  transition: 'all .2s',
                  fontFamily: 'inherit',
                  ...(mode === m ? {
                    background: 'linear-gradient(135deg, oklch(78% .2 200), oklch(65% .24 290))',
                    color: '#fff',
                    boxShadow: '0 4px 20px oklch(78% .2 200 / .3)',
                  } : {
                    background: 'transparent',
                    color: 'rgba(255,255,255,.45)',
                  }),
                }}
              >
                {m === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px',
              background: 'oklch(64% .24 25 / .12)',
              border: '1px solid oklch(64% .24 25 / .35)',
              borderRadius: 12, marginBottom: 20,
            }}>
              <AlertCircle size={15} style={{ color: 'oklch(64% .24 25)', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: 'oklch(64% .24 25)' }}>{error}</span>
            </div>
          )}

          {/* OAuth Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {/* Google */}
            <button
              onClick={() => handleOAuth('google')}
              disabled={busy}
              style={{
                width: '100%', padding: '11px 16px',
                background: '#fff', color: '#1f1f1f',
                border: 'none', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all .15s',
                opacity: busy ? 0.5 : 1,
                boxShadow: '0 2px 12px rgba(0,0,0,.2)',
              }}
              onMouseEnter={e => !busy && ((e.currentTarget as HTMLElement).style.background = '#f0f0f0')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#fff')}
            >
              {oauthLoading === 'google' ? (
                <Loader2 size={17} style={{ animation: 'spin 1s linear infinite', color: '#1f1f1f' }} />
              ) : (
                <svg width="17" height="17" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
              )}
              المتابعة مع Google
            </button>

            {/* Apple */}
            <button
              onClick={() => handleOAuth('apple')}
              disabled={busy}
              style={{
                width: '100%', padding: '11px 16px',
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.12)',
                borderRadius: 12, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all .15s',
                opacity: busy ? 0.5 : 1,
              }}
              onMouseEnter={e => !busy && ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.12)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.07)')}
            >
              {oauthLoading === 'apple' ? (
                <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05,20.28C16.07,21.23 15.03,21.08 14.03,20.68C12.95,20.26 11.96,20.24 10.82,20.68C9.39,21.26 8.64,21.09 7.78,20.28C3.21,15.64 3.86,8.34 9.05,8.05C10.36,8.12 11.27,8.8 12.04,8.85C13.19,8.63 14.29,7.99 15.53,8.07C17.09,8.19 18.26,8.84 19.03,10.03C15.79,12.06 16.56,16.26 19.53,17.49C18.94,18.8 18.18,20.09 17.04,20.29L17.05,20.28M12,8C11.88,6.04 13.47,4.43 15.31,4.26C15.57,6.5 13.34,8.22 12,8Z"/>
                </svg>
              )}
              المتابعة مع Apple
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.3)' }}>أو بالبريد الإلكتروني</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {mode === 'register' && (
              <InputField
                label="اسم المستخدم"
                icon={<UserIcon size={15} />}
                type="text"
                value={username}
                onChange={setUsername}
                placeholder="username"
                required
                minLength={3}
              />
            )}

            <InputField
              label="البريد الإلكتروني"
              icon={<Mail size={15} />}
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              required
            />

            <InputField
              label="كلمة المرور"
              icon={<Lock size={15} />}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              required
              minLength={8}
              hint={mode === 'register' ? '8 أحرف على الأقل' : undefined}
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={busy || !email || !password || (mode === 'register' && !username)}
              style={{
                width: '100%', padding: '13px 0',
                marginTop: 4,
                background: 'linear-gradient(135deg, oklch(78% .2 200), oklch(65% .24 290))',
                border: 'none', borderRadius: 13,
                color: '#fff', fontSize: 14, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 8px 28px oklch(78% .2 200 / .3)',
                transition: 'all .2s',
                opacity: (busy || !email || !password || (mode === 'register' && !username)) ? 0.5 : 1,
              }}
            >
              {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {loading ? 'جارٍ...' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
              {!loading && <ArrowLeft size={14} />}
            </button>
          </form>

          {/* Footer */}
          <div style={{
            textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.3)',
            paddingTop: 20, marginTop: 20,
            borderTop: '1px solid rgba(255,255,255,.05)',
          }}>
            بالمتابعة أنت توافق على{' '}
            <Link href="/terms" style={{ color: 'oklch(78% .2 200)', textDecoration: 'none' }}>شروط الخدمة</Link>
            {' '}و{' '}
            <Link href="/privacy" style={{ color: 'oklch(78% .2 200)', textDecoration: 'none' }}>سياسة الخصوصية</Link>
          </div>
        </div>
      </div>

      {/* Responsive + keyframe styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-grid { animation: fadeUp .5s ease both; }
        @media (max-width: 860px) {
          .login-grid {
            grid-template-columns: 1fr !important;
            padding: 20px 16px 40px !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ── Reusable Input ── */
function InputField({
  label, icon, type, value, onChange, placeholder, required, minLength, hint,
}: {
  label: string; icon: React.ReactNode; type: string;
  value: string; onChange: (v: string) => void;
  placeholder: string; required?: boolean; minLength?: number; hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: 7 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
          color: focused ? 'oklch(78% .2 200)' : 'rgba(255,255,255,.3)',
          pointerEvents: 'none', transition: 'color .15s',
        }}>
          {icon}
        </div>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          placeholder={placeholder}
          minLength={minLength}
          style={{
            width: '100%',
            padding: '11px 42px 11px 14px',
            background: focused ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.04)',
            border: focused
              ? '1px solid oklch(78% .2 200 / .5)'
              : '1px solid rgba(255,255,255,.09)',
            borderRadius: 11,
            color: '#fff', fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'all .15s',
            boxShadow: focused ? '0 0 0 3px oklch(78% .2 200 / .1)' : 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
      {hint && <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 5 }}>{hint}</p>}
    </div>
  );
}
