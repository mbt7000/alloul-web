'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { login, register, loginWithFirebase, getCurrentUser } from '@/lib/api-client';
import { setToken, setCachedUser, isAuthenticated } from '@/lib/auth';
import { signInWithGoogle, signInWithApple, getOAuthRedirectResult } from '@/lib/firebase';

type Mode = 'login' | 'register';
type OAuthProvider = 'google' | 'apple' | null;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider>(null);

  useEffect(() => {
    if (isAuthenticated()) { router.replace('/'); return; }
    getOAuthRedirectResult().then(async (idToken) => {
      if (!idToken) return;
      setOauthLoading('google');
      try {
        const res = await loginWithFirebase(idToken);
        await finishLogin(res.access_token, !!(res as any)?.is_new_user);
      } catch (err: any) {
        setError(err?.message || 'فشل الدخول عبر OAuth');
        setOauthLoading(null);
      }
    }).catch(() => {});
  }, [router]);

  const finishLogin = async (token: string, isNew = false) => {
    setToken(token);
    const me = await getCurrentUser();
    setCachedUser(me);
    router.replace(isNew ? '/onboarding' : '/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const res = mode === 'register'
        ? await register(username.trim(), email.trim(), password)
        : await login(email.trim(), password);
      await finishLogin(res.access_token, mode === 'register');
    } catch (err: any) {
      const msg = err?.message || '';
      setError(
        msg.toLowerCase().includes('database') || err?.status === 503
          ? 'الخادم تحت الصيانة، يرجى المحاولة بعد قليل'
          : msg || (mode === 'login' ? 'البريد أو كلمة المرور غير صحيحة' : 'فشل إنشاء الحساب')
      );
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setError(null); setOauthLoading(provider);
    try {
      const fn = provider === 'google' ? signInWithGoogle : signInWithApple;
      const idToken = await fn();
      if (!idToken) return;
      const res = await loginWithFirebase(idToken);
      await finishLogin(res.access_token, !!(res as any)?.is_new_user);
    } catch (err: any) {
      const c = err?.code || ''; const m = err?.message || '';
      if (!c.includes('popup-closed') && !c.includes('cancelled-popup')) {
        setError(m.includes('unauthorized-domain') ? 'يرجى استخدام البريد الإلكتروني' : m || 'فشل الدخول');
      }
      setOauthLoading(null);
    }
  };

  const busy = loading || oauthLoading !== null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        body { background: #06080e; font-family: 'Cairo', system-ui, sans-serif; color: #fff; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-glow {
          0%, 100% { opacity: .6; }
          50%       { opacity: 1; }
        }

        .lp-root {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          position: relative;
          overflow: hidden;
        }

        /* ── LEFT BRAND PANEL ── */
        .lp-brand {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: clamp(32px, 5vw, 60px);
          overflow: hidden;
          border-left: 1px solid rgba(255,255,255,.06);
        }
        .lp-brand::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 20% 10%, oklch(78% .2 200 / .15) 0%, transparent 65%),
            radial-gradient(ellipse 60% 70% at 80% 90%, oklch(65% .24 290 / .12) 0%, transparent 60%);
          pointer-events: none;
        }
        /* noise grain */
        .lp-brand::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        .lp-brand-inner { position: relative; z-index: 1; }

        .lp-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .lp-logo-mark {
          width: 42px; height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, oklch(78% .2 200), oklch(65% .24 290));
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 900; color: #06080e;
          box-shadow: 0 0 28px oklch(78% .2 200 / .35);
          flex-shrink: 0;
        }
        .lp-logo-text { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
        .lp-logo-sub  { font-size: 10px; color: rgba(255,255,255,.35); margin-top: 2px; }

        .lp-hero {
          margin-top: auto;
          margin-bottom: auto;
          padding: 60px 0;
        }
        .lp-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 700;
          color: oklch(78% .2 200);
          background: oklch(78% .2 200 / .1);
          border: 1px solid oklch(78% .2 200 / .3);
          border-radius: 100px;
          padding: 5px 14px;
          margin-bottom: 28px;
          animation: pulse-glow 3s ease infinite;
        }
        .lp-badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: oklch(78% .2 200);
          box-shadow: 0 0 8px oklch(78% .2 200);
        }

        .lp-headline {
          font-size: clamp(38px, 4.5vw, 62px);
          font-weight: 900;
          line-height: 1.12;
          letter-spacing: -1.5px;
          color: #fff;
          margin-bottom: 20px;
        }
        .lp-headline em {
          font-style: normal;
          background: linear-gradient(135deg,
            oklch(78% .2 200) 0%,
            oklch(72% .2 155) 40%,
            oklch(80% .18 75) 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .lp-desc {
          font-size: 15px;
          color: rgba(255,255,255,.48);
          line-height: 1.8;
          max-width: 400px;
        }

        .lp-stats {
          display: flex;
          gap: 28px;
          margin-top: 44px;
          padding-top: 36px;
          border-top: 1px solid rgba(255,255,255,.07);
        }
        .lp-stat-val {
          font-size: 26px;
          font-weight: 900;
          color: #fff;
          letter-spacing: -1px;
          line-height: 1;
        }
        .lp-stat-lbl {
          font-size: 11px;
          color: rgba(255,255,255,.35);
          margin-top: 4px;
        }

        .lp-footer-text {
          font-size: 11px;
          color: rgba(255,255,255,.2);
        }

        /* ── RIGHT FORM PANEL ── */
        .lp-form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(24px, 5vw, 60px);
          background: rgba(255,255,255,.015);
          position: relative;
        }

        .lp-card {
          width: 100%;
          max-width: 420px;
          animation: fadeUp .45s ease both;
        }

        .lp-card-title {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #fff;
          margin-bottom: 6px;
        }
        .lp-card-sub {
          font-size: 13px;
          color: rgba(255,255,255,.4);
          margin-bottom: 28px;
        }

        /* Mode toggle */
        .lp-tabs {
          display: flex;
          gap: 0;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 28px;
        }
        .lp-tab {
          flex: 1;
          padding: 9px 0;
          font-size: 13px;
          font-weight: 800;
          font-family: inherit;
          border: none;
          border-radius: 9px;
          cursor: pointer;
          transition: all .2s;
        }
        .lp-tab.active {
          background: #fff;
          color: #06080e;
          box-shadow: 0 2px 12px rgba(0,0,0,.3);
        }
        .lp-tab:not(.active) {
          background: transparent;
          color: rgba(255,255,255,.4);
        }
        .lp-tab:not(.active):hover { color: rgba(255,255,255,.7); }

        /* OAuth */
        .lp-oauth { display: flex; flex-direction: column; gap: 10px; margin-bottom: 22px; }

        .lp-oauth-btn {
          width: 100%;
          padding: 12px 18px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          font-family: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: all .15s;
          border: none;
        }
        .lp-oauth-btn:disabled { opacity: .5; cursor: not-allowed; }

        .lp-oauth-google {
          background: #fff;
          color: #1f1f1f;
          box-shadow: 0 1px 8px rgba(0,0,0,.2);
        }
        .lp-oauth-google:hover:not(:disabled) { background: #f2f2f2; }

        .lp-oauth-apple {
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.1) !important;
          color: #fff;
        }
        .lp-oauth-apple:hover:not(:disabled) { background: rgba(255,255,255,.12); }

        /* Divider */
        .lp-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 22px;
          color: rgba(255,255,255,.25);
          font-size: 11px;
          font-weight: 600;
        }
        .lp-divider-line { flex: 1; height: 1px; background: rgba(255,255,255,.08); }

        /* Fields */
        .lp-fields { display: flex; flex-direction: column; gap: 14px; }

        .lp-field-lbl {
          font-size: 11px;
          font-weight: 700;
          color: rgba(255,255,255,.45);
          display: block;
          margin-bottom: 7px;
        }
        .lp-field-wrap { position: relative; }
        .lp-field-icon {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: rgba(255,255,255,.25);
          transition: color .15s;
          display: flex;
        }
        .lp-field-icon.end { right: auto; left: 14px; pointer-events: all; cursor: pointer; }
        .lp-input {
          width: 100%;
          padding: 12px 42px 12px 14px;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 11px;
          color: #fff;
          font-size: 13px;
          font-family: inherit;
          outline: none;
          transition: all .18s;
        }
        .lp-input::placeholder { color: rgba(255,255,255,.22); }
        .lp-input:focus {
          background: rgba(255,255,255,.08);
          border-color: oklch(78% .2 200 / .6);
          box-shadow: 0 0 0 3px oklch(78% .2 200 / .1);
        }
        .lp-input:focus + .lp-field-icon,
        .lp-field-wrap:focus-within .lp-field-icon { color: oklch(78% .2 200 / .7); }
        .lp-input-hint { font-size: 10px; color: rgba(255,255,255,.25); margin-top: 5px; }

        /* Error */
        .lp-error {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 11px 13px;
          background: oklch(64% .24 25 / .1);
          border: 1px solid oklch(64% .24 25 / .3);
          border-radius: 11px;
          margin-bottom: 18px;
          font-size: 12.5px;
          color: oklch(75% .2 25);
        }

        /* Submit */
        .lp-submit {
          width: 100%;
          padding: 14px;
          margin-top: 6px;
          background: linear-gradient(135deg, oklch(78% .2 200) 0%, oklch(65% .24 290) 100%);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 14px;
          font-weight: 900;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 8px 32px oklch(78% .2 200 / .28);
          transition: all .2s;
          letter-spacing: -0.2px;
        }
        .lp-submit:hover:not(:disabled) {
          box-shadow: 0 12px 40px oklch(78% .2 200 / .4);
          transform: translateY(-1px);
        }
        .lp-submit:disabled { opacity: .45; cursor: not-allowed; transform: none; }

        .lp-legal {
          text-align: center;
          font-size: 11px;
          color: rgba(255,255,255,.25);
          padding-top: 20px;
          margin-top: 20px;
          border-top: 1px solid rgba(255,255,255,.05);
        }
        .lp-legal a { color: oklch(78% .2 200 / .8); text-decoration: none; }
        .lp-legal a:hover { color: oklch(78% .2 200); }

        /* Responsive */
        @media (max-width: 820px) {
          .lp-root { grid-template-columns: 1fr; }
          .lp-brand {
            padding: 28px 24px;
            border-left: none;
            border-bottom: 1px solid rgba(255,255,255,.06);
          }
          .lp-hero { padding: 28px 0; }
          .lp-headline { font-size: 32px; }
          .lp-stats { display: none; }
          .lp-form-panel { padding: 32px 20px 48px; }
        }
      `}</style>

      <div className="lp-root">

        {/* ════════════════════════════════════════
            LEFT — Brand Identity
        ════════════════════════════════════════ */}
        <div className="lp-brand">
          {/* Logo */}
          <div className="lp-brand-inner lp-logo">
            <div className="lp-logo-mark">A</div>
            <div>
              <div className="lp-logo-text">
                ALLOUL<span style={{ color: 'oklch(78% .2 200)' }}>&amp;Q</span>
              </div>
              <div className="lp-logo-sub">منصة الأعمال الذكية</div>
            </div>
          </div>

          {/* Hero copy */}
          <div className="lp-brand-inner lp-hero">
            <div className="lp-badge">
              <span className="lp-badge-dot" />
              مدعوم بـ ALLOUL Agent
            </div>

            <h2 className="lp-headline">
              مساحة عمل<br />
              <em>واحدة لكل شيء</em><br />
              تحتاجه شركتك
            </h2>

            <p className="lp-desc">
              مهام، مشاريع، اجتماعات، CRM، مكالمات، وتسليمات ذكية — كلها في تطبيق واحد مدعوم بالذكاء الاصطناعي.
            </p>

            <div className="lp-stats">
              {[
                { val: '+٢٠٠', lbl: 'شركة تستخدم المنصة' },
                { val: '١٤', lbl: 'يوم تجربة مجانية' },
                { val: '٩٩٪', lbl: 'وقت تشغيل مضمون' },
              ].map((s, i) => (
                <div key={i}>
                  <div className="lp-stat-val">{s.val}</div>
                  <div className="lp-stat-lbl">{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="lp-brand-inner lp-footer-text">
            © 2025 Alloul&Q · جميع الحقوق محفوظة
          </div>
        </div>

        {/* ════════════════════════════════════════
            RIGHT — Auth Form
        ════════════════════════════════════════ */}
        <div className="lp-form-panel">
          <div className="lp-card">

            <h3 className="lp-card-title">
              {mode === 'login' ? 'مرحباً بعودتك' : 'إنشاء حساب جديد'}
            </h3>
            <p className="lp-card-sub">
              {mode === 'login'
                ? 'سجّل الدخول للوصول إلى مساحة عملك'
                : 'ابدأ تجربتك المجانية لمدة 14 يوماً'}
            </p>

            {/* Tabs */}
            <div className="lp-tabs">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(null); }}
                  className={`lp-tab${mode === m ? ' active' : ''}`}
                >
                  {m === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="lp-error">
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}

            {/* OAuth */}
            <div className="lp-oauth">
              <button
                className="lp-oauth-btn lp-oauth-google"
                onClick={() => handleOAuth('google')}
                disabled={busy}
              >
                {oauthLoading === 'google'
                  ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#1f1f1f' }} />
                  : <svg width="16" height="16" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                    </svg>
                }
                المتابعة مع Google
              </button>

              <button
                className="lp-oauth-btn lp-oauth-apple"
                onClick={() => handleOAuth('apple')}
                disabled={busy}
              >
                {oauthLoading === 'apple'
                  ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05,20.28C16.07,21.23 15.03,21.08 14.03,20.68C12.95,20.26 11.96,20.24 10.82,20.68C9.39,21.26 8.64,21.09 7.78,20.28C3.21,15.64 3.86,8.34 9.05,8.05C10.36,8.12 11.27,8.8 12.04,8.85C13.19,8.63 14.29,7.99 15.53,8.07C17.09,8.19 18.26,8.84 19.03,10.03C15.79,12.06 16.56,16.26 19.53,17.49C18.94,18.8 18.18,20.09 17.04,20.29L17.05,20.28M12,8C11.88,6.04 13.47,4.43 15.31,4.26C15.57,6.5 13.34,8.22 12,8Z"/>
                    </svg>
                }
                المتابعة مع Apple
              </button>
            </div>

            {/* Divider */}
            <div className="lp-divider">
              <div className="lp-divider-line" />
              أو بالبريد الإلكتروني
              <div className="lp-divider-line" />
            </div>

            {/* Fields */}
            <form onSubmit={handleSubmit}>
              <div className="lp-fields">
                {mode === 'register' && (
                  <div>
                    <label className="lp-field-lbl">اسم المستخدم</label>
                    <div className="lp-field-wrap">
                      <input
                        className="lp-input"
                        type="text" value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="اسمك أو اسم المستخدم"
                        required minLength={3}
                        style={{ paddingRight: 14 }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="lp-field-lbl">البريد الإلكتروني</label>
                  <div className="lp-field-wrap">
                    <input
                      className="lp-input"
                      type="email" value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      style={{ paddingRight: 14 }}
                    />
                  </div>
                </div>

                <div>
                  <label className="lp-field-lbl">كلمة المرور</label>
                  <div className="lp-field-wrap">
                    <input
                      className="lp-input"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      required minLength={8}
                      style={{ paddingLeft: 42, paddingRight: 14 }}
                    />
                    <span
                      className="lp-field-icon end"
                      onClick={() => setShowPw(v => !v)}
                    >
                      {showPw
                        ? <EyeOff size={15} style={{ color: 'rgba(255,255,255,.4)' }} />
                        : <Eye     size={15} style={{ color: 'rgba(255,255,255,.4)' }} />
                      }
                    </span>
                  </div>
                  {mode === 'register' && (
                    <p className="lp-input-hint">8 أحرف على الأقل</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="lp-submit"
                disabled={busy || !email || !password || (mode === 'register' && !username)}
              >
                {loading
                  ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> جارٍ التحقق...</>
                  : <>{mode === 'login' ? 'دخول' : 'إنشاء الحساب'} <ArrowLeft size={15} /></>
                }
              </button>
            </form>

            {/* Legal */}
            <div className="lp-legal">
              بالمتابعة أنت توافق على{' '}
              <Link href="/terms">شروط الخدمة</Link>
              {' '}و{' '}
              <Link href="/privacy">سياسة الخصوصية</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
