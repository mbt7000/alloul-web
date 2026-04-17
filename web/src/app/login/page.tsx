'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Lock, Mail, Loader2, AlertCircle, User as UserIcon,
  Sparkles, CheckSquare, Users, TrendingUp, Calendar, MessageSquare,
  Zap, Shield, Globe,
} from 'lucide-react';
import { login, register, loginWithFirebase, getCurrentUser } from '@/lib/api-client';
import { setToken, setCachedUser, isAuthenticated } from '@/lib/auth';
import { signInWithGoogle, signInWithApple } from '@/lib/firebase';

type Mode = 'login' | 'register';
type OAuthProvider = 'google' | 'apple' | null;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider>(null);

  useEffect(() => {
    if (isAuthenticated()) router.replace('/');
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
      setError(err?.message || (mode === 'login' ? 'البريد أو كلمة المرور غير صحيحة' : 'فشل إنشاء الحساب، ربما البريد مستخدم مسبقاً'));
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setError(null);
    setOauthLoading(provider);
    try {
      const idToken = provider === 'google' ? await signInWithGoogle() : await signInWithApple();
      const res = await loginWithFirebase(idToken);
      const isNew = !!(res as any)?.is_new_user;
      await finishLogin(res.access_token, isNew);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('popup-closed-by-user') || msg.includes('popup_closed_by_user') || msg.includes('cancelled')) {
        // user dismissed — silent
      } else if (msg.includes('unauthorized-domain') || msg.includes('auth/unauthorized-domain')) {
        setError('يرجى تفعيل النطاق في Firebase Console أو استخدم البريد الإلكتروني');
      } else if (msg.includes('network') || msg.includes('Network')) {
        setError('تعذّر الاتصال. تحقق من اتصالك بالإنترنت.');
      } else {
        setError(msg || `فشل الدخول عبر ${provider === 'google' ? 'Google' : 'Apple'}`);
      }
      setOauthLoading(null);
    }
  };

  const busy = loading || oauthLoading !== null;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="pointer-events-none fixed top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[140px] animate-float-orb" />
      <div className="pointer-events-none fixed bottom-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full bg-secondary/15 blur-[160px] animate-float-orb" />
      <div className="pointer-events-none fixed top-[30%] left-[40%] w-[400px] h-[400px] rounded-full bg-accent/10 blur-[120px]" />

      <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 px-4 py-10 lg:py-16 min-h-screen items-center">

        {/* Left: presentation */}
        <div className="order-2 lg:order-1 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-glow-primary border border-primary/30">
              <Image src="/icon.png" alt="ALLOUL&Q" width={56} height={56} priority />
            </div>
            <div>
              <h1 className="text-white font-black text-2xl leading-tight">
                ALLOUL<span className="text-secondary">&Q</span>
              </h1>
              <p className="text-white/50 text-xs">منصة الأعمال الذكية</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass-subtle gap-2 border-accent-500/40 text-accent-500">
              <Sparkles size={14} />
              <span>مدعوم بـ ALLOUL Agent الخاص</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black leading-tight">
              مساحة عمل واحدة
              <br />
              <span className="bg-gradient-to-r from-primary-500 via-accent-500 to-secondary-500 bg-clip-text text-transparent">
                لكل شيء تحتاجه شركتك
              </span>
            </h2>
            <p className="text-white/70 text-base lg:text-lg leading-relaxed max-w-xl">
              مهام، مشاريع، اجتماعات، CRM، مكالمات، وتسليمات ذكية — كلها في تطبيق واحد.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Sparkles,      label: 'مساعد AI',      sub: 'تلخيص + تحليل', color: '#8B5CF6' },
              { icon: CheckSquare,   label: 'مهام ومشاريع',  sub: 'تنظيم كامل',    color: '#2E8BFF' },
              { icon: TrendingUp,    label: 'CRM وصفقات',    sub: 'خط أنابيب ذكي', color: '#FFB24D' },
              { icon: Calendar,      label: 'اجتماعات',      sub: 'جدولة ذكية',    color: '#14E0A4' },
              { icon: Users,         label: 'فريق العمل',    sub: 'أدوار وصلاحيات',color: '#00D4FF' },
              { icon: MessageSquare, label: 'تواصل داخلي',   sub: 'شات + مكالمات', color: '#FF4757' },
            ].map((f, i) => (
              <div key={i} className="glass glass-hover p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${f.color}22`, border: `1px solid ${f.color}55` }}>
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <div>
                  <p className="font-bold text-sm">{f.label}</p>
                  <p className="text-xs text-white/50">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <div className="glass-subtle gap-2"><Shield size={12} className="text-secondary-500" /><span>بيانات مشفّرة</span></div>
            <div className="glass-subtle gap-2"><Zap size={12} className="text-accent-500" /><span>تجربة مجانية 14 يوم</span></div>
            <div className="glass-subtle gap-2"><Globe size={12} className="text-primary-500" /><span>عربي + إنجليزي</span></div>
          </div>
        </div>

        {/* Right: Auth card */}
        <div className="order-1 lg:order-2 w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
          <div className="glass-strong p-7 glass-ring-primary">

            <div className="flex bg-white/5 rounded-full p-1 mb-6">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(null); }}
                  className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${
                    mode === m ? 'bg-gradient-primary text-white shadow-glow-primary' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {m === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
                </button>
              ))}
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-danger/10 border border-danger/30 mb-4">
                <AlertCircle size={16} className="text-danger flex-shrink-0 mt-0.5" />
                <span className="text-danger text-sm">{error}</span>
              </div>
            )}

            {/* Google + Apple */}
            <div className="space-y-2.5 mb-5">
              <button
                onClick={() => handleOAuth('google')}
                disabled={busy}
                className="w-full bg-white hover:bg-white/90 text-[#1f1f1f] font-bold py-3 rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {oauthLoading === 'google' ? <Loader2 size={18} className="animate-spin text-[#1f1f1f]" /> : (
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                )}
                <span className="text-sm">المتابعة مع Google</span>
              </button>

              <button
                onClick={() => handleOAuth('apple')}
                disabled={busy}
                className="w-full bg-black hover:bg-black/80 border border-white/10 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {oauthLoading === 'apple' ? <Loader2 size={18} className="animate-spin" /> : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05,20.28C16.07,21.23 15.03,21.08 14.03,20.68C12.95,20.26 11.96,20.24 10.82,20.68C9.39,21.26 8.64,21.09 7.78,20.28C3.21,15.64 3.86,8.34 9.05,8.05C10.36,8.12 11.27,8.8 12.04,8.85C13.19,8.63 14.29,7.99 15.53,8.07C17.09,8.19 18.26,8.84 19.03,10.03C15.79,12.06 16.56,16.26 19.53,17.49C18.94,18.8 18.18,20.09 17.04,20.29L17.05,20.28M12,8C11.88,6.04 13.47,4.43 15.31,4.26C15.57,6.5 13.34,8.22 12,8Z"/>
                  </svg>
                )}
                <span className="text-sm">المتابعة مع Apple</span>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/40 text-xs">أو بالبريد الإلكتروني</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="text-white/60 text-xs font-bold block mb-2">اسم المستخدم</label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      placeholder="username"
                      minLength={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-11 pl-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-white/60 text-xs font-bold block mb-2">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-11 pl-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07]"
                  />
                </div>
              </div>

              <div>
                <label className="text-white/60 text-xs font-bold block mb-2">كلمة المرور</label>
                <div className="relative">
                  <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    minLength={8}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-11 pl-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07]"
                  />
                </div>
                {mode === 'register' && (
                  <p className="text-white/40 text-xs mt-2">8 أحرف على الأقل</p>
                )}
              </div>

              <button
                type="submit"
                disabled={busy || !email || !password || (mode === 'register' && !username)}
                className="w-full bg-gradient-primary text-white font-bold py-3.5 rounded-xl shadow-glow-primary hover:shadow-glow-accent transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                <span>{loading ? 'جاري...' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}</span>
              </button>
            </form>

            <div className="text-center text-white/40 text-xs pt-5 mt-5 border-t border-white/5">
              بالمتابعة أنت توافق على{' '}
              <Link href="/terms" className="text-accent hover:underline">شروط الخدمة</Link>
              {' '}و{' '}
              <Link href="/privacy" className="text-accent hover:underline">سياسة الخصوصية</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
