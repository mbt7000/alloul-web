'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Building2, Mail, UserCircle2, Lock, Loader2,
  CheckCircle, XCircle, ArrowRight, Eye, EyeOff,
  Clock, ShieldCheck, UserPlus, LogIn,
} from 'lucide-react';
import { isAuthenticated, getCachedUser, setToken } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.alloul.app';

const ROLE_LABEL: Record<string, string> = {
  employee: 'موظف',
  manager:  'مدير',
  admin:    'مشرف',
  owner:    'مالك',
};
const ROLE_COLOR: Record<string, string> = {
  employee: '#2E8BFF',
  manager:  '#8B5CF6',
  admin:    '#EF4444',
  owner:    '#F59E0B',
};

interface InviteInfo {
  token: string;
  company_name: string;
  company_logo: string | null;
  inviter_name: string | null;
  role: string;
  email: string;
  expires_at: string;
}

type Stage = 'loading' | 'preview' | 'submitting' | 'success' | 'error';
type Mode  = 'new' | 'existing';

function EmailInviteInner() {
  const params    = useParams<{ token: string }>();
  const token     = params.token ?? '';
  const router    = useRouter();
  const cachedUser = getCachedUser();
  const loggedIn   = isAuthenticated();

  const [stage,    setStage]    = useState<Stage>('loading');
  const [info,     setInfo]     = useState<InviteInfo | null>(null);
  const [errMsg,   setErrMsg]   = useState('');
  const [mode,     setMode]     = useState<Mode>(loggedIn ? 'existing' : 'new');

  // Form fields (new account)
  const [name,     setName]     = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);

  // Field-level errors
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});

  // ── 1. Load invite info ────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setErrMsg('رابط الدعوة غير صالح'); setStage('error'); return; }
    (async () => {
      try {
        const res  = await fetch(`${API_BASE}/companies/email-invite/${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'رابط غير صالح');
        setInfo(data);
        setStage('preview');
        // Pre-fill name if logged in
        if (cachedUser?.name)     setName(cachedUser.name);
        if (cachedUser?.username) setUsername(cachedUser.username);
      } catch (e: any) {
        setErrMsg(e.message);
        setStage('error');
      }
    })();
  }, [token]);

  // ── 2. Accept ──────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    // Validate new-account form
    if (mode === 'new') {
      const errs: Record<string, string> = {};
      if (!name.trim())                       errs.name     = 'الاسم مطلوب';
      if (!username.trim())                   errs.username = 'اسم المستخدم مطلوب';
      else if (!/^[a-z0-9_]{3,20}$/.test(username.trim()))
                                              errs.username = '٣–٢٠ حرف: a-z, 0-9, _';
      if (password.length < 8)               errs.password = '٨ أحرف على الأقل';
      if (Object.keys(errs).length) { setFieldErr(errs); return; }
    }
    setFieldErr({});
    setStage('submitting');

    // For existing-account mode, pass logged-in user data (backend ignores username/password)
    const body = {
      token,
      name:     mode === 'existing' ? (cachedUser?.name || cachedUser?.username || 'user') : name.trim(),
      username: mode === 'existing' ? (cachedUser?.username || 'user')                      : username.trim(),
      password: mode === 'existing' ? '________'                                            : password,
    };

    try {
      const res  = await fetch(`${API_BASE}/companies/email-invite/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'فشل قبول الدعوة');

      // Auto-login with returned JWT
      if (data.access_token) setToken(data.access_token);
      setStage('success');
    } catch (e: any) {
      setErrMsg(e.message);
      setStage('error');
    }
  };

  // ── Shared page shell ──────────────────────────────────────────────────────
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: '#070B14' }}
      dir="rtl"
    >
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(20,224,164,0.06) 0%, transparent 70%)' }}
      />
      <div className="relative w-full max-w-sm space-y-6">
        {/* Wordmark */}
        <div className="flex justify-center">
          <Link href="/" className="text-white font-black text-xl tracking-tight">
            ALLOUL<span style={{ color: '#14E0A4' }}>&Q</span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (stage === 'loading') return (
    <Shell>
      <div className="flex flex-col items-center gap-3 py-16">
        <Loader2 size={28} className="animate-spin" style={{ color: '#14E0A4' }} />
        <p className="text-white/40 text-sm">جارٍ التحقق من الدعوة…</p>
      </div>
    </Shell>
  );

  // ── SUBMITTING ─────────────────────────────────────────────────────────────
  if (stage === 'submitting') return (
    <Shell>
      <div className="flex flex-col items-center gap-3 py-16">
        <Loader2 size={28} className="animate-spin" style={{ color: '#14E0A4' }} />
        <p className="text-white/40 text-sm">جارٍ معالجة الدعوة…</p>
      </div>
    </Shell>
  );

  // ── ERROR ──────────────────────────────────────────────────────────────────
  if (stage === 'error') return (
    <Shell>
      <div
        className="rounded-2xl p-8 text-center space-y-4"
        style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}
      >
        <XCircle size={44} className="mx-auto text-red-400" />
        <p className="text-white font-bold text-base">{errMsg}</p>
        <p className="text-white/35 text-xs leading-relaxed">
          الرابط منتهي أو تم استخدامه — تواصل مع من أرسل لك الدعوة للحصول على رابط جديد
        </p>
        <Link href="/" className="block text-primary text-sm font-bold hover:underline mt-2">
          العودة للرئيسية
        </Link>
      </div>
    </Shell>
  );

  // ── SUCCESS ────────────────────────────────────────────────────────────────
  if (stage === 'success') return (
    <Shell>
      <div
        className="rounded-2xl p-8 text-center space-y-5"
        style={{ background: 'rgba(20,224,164,0.05)', border: '1px solid rgba(20,224,164,0.25)' }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: 'rgba(20,224,164,0.12)', border: '1px solid rgba(20,224,164,0.3)' }}
        >
          <CheckCircle size={32} style={{ color: '#14E0A4' }} />
        </div>
        <div>
          <p className="text-white font-black text-xl">مرحباً بك! 🎉</p>
          <p className="text-white/50 text-sm mt-1">
            انضممت إلى <span className="text-white font-bold">{info?.company_name}</span> كـ{' '}
            <span style={{ color: ROLE_COLOR[info?.role ?? ''] ?? '#14E0A4' }} className="font-bold">
              {ROLE_LABEL[info?.role ?? ''] ?? info?.role}
            </span>
          </p>
        </div>
        <button
          onClick={() => router.push('/workspace')}
          className="w-full py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)', color: '#050810' }}
        >
          <ArrowRight size={16} /> الذهاب لمساحة العمل
        </button>
      </div>
    </Shell>
  );

  // ── PREVIEW ────────────────────────────────────────────────────────────────
  const roleColor = ROLE_COLOR[info?.role ?? ''] ?? '#14E0A4';
  const expiresAt = info ? new Date(info.expires_at) : null;
  const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 36e5)) : 0;

  return (
    <Shell>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Top accent bar */}
        <div className="h-1" style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)' }} />

        <div className="p-6 space-y-5">

          {/* ── Invite badge ── */}
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: 'rgba(20,224,164,0.12)', border: '1px solid rgba(20,224,164,0.3)', color: '#14E0A4' }}
            >
              دعوة للانضمام
            </span>
            {hoursLeft > 0 && (
              <span className="flex items-center gap-1 text-white/30 text-xs">
                <Clock size={11} /> تنتهي بعد {hoursLeft}س
              </span>
            )}
          </div>

          {/* ── Company card ── */}
          <div
            className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: 'rgba(20,224,164,0.1)', border: '1px solid rgba(20,224,164,0.2)' }}
            >
              {info?.company_logo
                ? <Image src={info.company_logo} alt="" width={48} height={48} className="object-cover w-full h-full" />
                : <Building2 size={20} style={{ color: '#14E0A4' }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm truncate">{info?.company_name}</p>
              {info?.inviter_name && (
                <p className="text-white/40 text-xs mt-0.5">
                  دعوة من <span className="text-white/60">{info.inviter_name}</span>
                </p>
              )}
            </div>
            {/* Role badge */}
            <span
              className="text-xs font-black px-2.5 py-1 rounded-full flex-shrink-0"
              style={{ background: `${roleColor}18`, border: `1px solid ${roleColor}40`, color: roleColor }}
            >
              {ROLE_LABEL[info?.role ?? ''] ?? info?.role}
            </span>
          </div>

          {/* ── Email badge ── */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Mail size={13} className="text-white/30 flex-shrink-0" />
            <span className="text-white/60 text-xs font-mono truncate">{info?.email}</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mr-auto"
              style={{ background: 'rgba(20,224,164,0.1)', color: '#14E0A4' }}
            >
              هذا البريد
            </span>
          </div>

          {/* ── Mode toggle ── */}
          <div
            className="flex rounded-xl overflow-hidden p-0.5 gap-0.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {([
              { k: 'new',      icon: <UserPlus size={12}/>,  label: 'حساب جديد'  },
              { k: 'existing', icon: <LogIn    size={12}/>,  label: 'لدي حساب'   },
            ] as const).map(m => (
              <button
                key={m.k}
                onClick={() => { setMode(m.k); setFieldErr({}); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: mode === m.k ? 'rgba(20,224,164,0.15)' : 'transparent',
                  color: mode === m.k ? '#14E0A4' : 'rgba(255,255,255,0.35)',
                  border: mode === m.k ? '1px solid rgba(20,224,164,0.3)' : '1px solid transparent',
                }}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {/* ── NEW ACCOUNT form ── */}
          {mode === 'new' && (
            <div className="space-y-3">

              {/* Full name */}
              <div>
                <div className="relative">
                  <UserCircle2 size={14} className="absolute right-3 top-3.5 text-white/25 pointer-events-none" />
                  <input
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="الاسم الكامل"
                    className="w-full bg-white/5 border rounded-xl py-3 pr-9 pl-4 text-sm text-white placeholder:text-white/25 focus:outline-none transition-colors"
                    style={{ borderColor: fieldErr.name ? '#EF4444' : 'rgba(255,255,255,0.1)' }}
                  />
                </div>
                {fieldErr.name && <p className="text-red-400 text-[11px] mt-1 pr-1">{fieldErr.name}</p>}
              </div>

              {/* Username */}
              <div>
                <div className="relative">
                  <span className="absolute right-3 top-3 text-white/25 text-sm select-none">@</span>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="اسم المستخدم"
                    dir="ltr"
                    className="w-full bg-white/5 border rounded-xl py-3 pr-8 pl-4 text-sm text-white placeholder:text-white/25 focus:outline-none transition-colors font-mono"
                    style={{ borderColor: fieldErr.username ? '#EF4444' : 'rgba(255,255,255,0.1)' }}
                  />
                </div>
                {fieldErr.username && <p className="text-red-400 text-[11px] mt-1 pr-1">{fieldErr.username}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="relative">
                  <Lock size={14} className="absolute right-3 top-3.5 text-white/25 pointer-events-none" />
                  <input
                    value={password} onChange={e => setPassword(e.target.value)}
                    type={showPw ? 'text' : 'password'}
                    placeholder="كلمة المرور (٨ أحرف+)"
                    dir="ltr"
                    className="w-full bg-white/5 border rounded-xl py-3 pr-9 pl-10 text-sm text-white placeholder:text-white/25 focus:outline-none transition-colors"
                    style={{ borderColor: fieldErr.password ? '#EF4444' : 'rgba(255,255,255,0.1)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute left-3 top-3.5 text-white/25 hover:text-white/50 transition-colors"
                  >
                    {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
                {fieldErr.password && <p className="text-red-400 text-[11px] mt-1 pr-1">{fieldErr.password}</p>}
              </div>

              {/* Privacy note */}
              <p className="text-white/25 text-[11px] flex items-center gap-1.5">
                <ShieldCheck size={11} />
                بريدك محدد مسبقاً من الدعوة ولا يمكن تغييره
              </p>
            </div>
          )}

          {/* ── EXISTING ACCOUNT info ── */}
          {mode === 'existing' && (
            <div className="space-y-3">
              {loggedIn && cachedUser ? (
                <div
                  className="rounded-xl p-4 flex items-center gap-3"
                  style={{ background: 'rgba(20,224,164,0.06)', border: '1px solid rgba(20,224,164,0.2)' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black"
                    style={{ background: 'rgba(20,224,164,0.15)', color: '#14E0A4' }}
                  >
                    {(cachedUser.name || cachedUser.username || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{cachedUser.name || cachedUser.username}</p>
                    <p className="text-white/40 text-xs truncate">@{cachedUser.username}</p>
                  </div>
                  <ShieldCheck size={16} style={{ color: '#14E0A4' }} className="flex-shrink-0" />
                </div>
              ) : (
                <div
                  className="rounded-xl p-4 text-center space-y-3"
                  style={{ background: 'rgba(46,139,255,0.07)', border: '1px solid rgba(46,139,255,0.2)' }}
                >
                  <p className="text-blue-300 text-sm font-bold">تسجيل الدخول مطلوب</p>
                  <p className="text-white/35 text-xs">سجّل دخولك أولاً ثم ارجع لهذه الصفحة</p>
                  <button
                    onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/email-invite/${token}`)}`)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:brightness-110"
                    style={{ background: 'rgba(46,139,255,0.15)', border: '1px solid rgba(46,139,255,0.3)', color: '#60A5FA' }}
                  >
                    <LogIn size={13}/> تسجيل الدخول
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Accept button ── */}
          {(mode === 'new' || (mode === 'existing' && loggedIn)) && (
            <button
              onClick={handleAccept}
              className="w-full py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)', color: '#050810' }}
            >
              <CheckCircle size={16} />
              {mode === 'new' ? 'إنشاء الحساب والانضمام' : 'قبول الدعوة'}
            </button>
          )}

          <p className="text-white/20 text-[11px] text-center">
            بالانضمام توافق على{' '}
            <Link href="/terms" className="underline">شروط الاستخدام</Link>
            {' '}و{' '}
            <Link href="/privacy" className="underline">سياسة الخصوصية</Link>
          </p>

        </div>
      </div>
    </Shell>
  );
}

export default function EmailInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070B14' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: '#14E0A4' }} />
      </div>
    }>
      <EmailInviteInner />
    </Suspense>
  );
}
