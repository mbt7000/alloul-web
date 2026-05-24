'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Building2, Users, CheckCircle, Loader2, XCircle,
  ArrowRight, LogIn, UserPlus,
} from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.alloul.app';

interface Preview {
  company_name: string;
  company_logo: string | null;
  company_type: string | null;
  members_count: number;
}

type Stage = 'loading' | 'preview' | 'joining' | 'success' | 'error' | 'no-code';

// useSearchParams requires Suspense in Next.js App Router
export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070B14' }}>
        <Loader2 size={28} className="text-primary animate-spin" />
      </div>
    }>
      <JoinPageInner />
    </Suspense>
  );
}

function JoinPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const code         = searchParams.get('code')?.trim().toUpperCase() ?? '';

  const [stage,   setStage]   = useState<Stage>('loading');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [errMsg,  setErrMsg]  = useState('');
  const loggedIn = isAuthenticated();

  // 1 — fetch company preview (public, no auth)
  useEffect(() => {
    if (!code) { setStage('no-code'); return; }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/companies/join-preview?code=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'رمز غير صالح');
        setPreview(data);
        setStage('preview');
      } catch (e: any) {
        setErrMsg(e.message || 'رمز الدعوة غير صالح أو منتهي الصلاحية');
        setStage('error');
      }
    })();
  }, [code]);

  // 2 — join action (requires auth)
  const handleJoin = async () => {
    if (!loggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(`/join?code=${code}`)}`);
      return;
    }
    setStage('joining');
    try {
      await apiFetch('/companies/join', {
        method: 'POST',
        body: JSON.stringify({ invite_code: code }),
      });
      setStage('success');
    } catch (e: any) {
      setErrMsg(e?.detail || e?.message || 'فشل الانضمام');
      setStage('error');
    }
  };

  // Shared wrapper
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#070B14' }}
      dir="rtl"
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(20,224,164,0.06) 0%, transparent 70%)',
        }}
      />
      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-white font-black text-xl tracking-tight">ALLOUL<span style={{ color: '#14E0A4' }}>&Q</span></span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if (stage === 'loading') return (
    <Wrapper>
      <div className="flex flex-col items-center gap-3 py-16">
        <Loader2 size={28} className="text-primary animate-spin" />
        <p className="text-white/40 text-sm">جارٍ التحقق من الدعوة…</p>
      </div>
    </Wrapper>
  );

  // ── NO CODE ──────────────────────────────────────────────────────────────────
  if (stage === 'no-code') return (
    <Wrapper>
      <div
        className="rounded-2xl p-8 text-center space-y-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <XCircle size={40} className="text-white/20 mx-auto" />
        <p className="text-white/60 text-sm">رابط الدعوة غير مكتمل</p>
        <Link href="/" className="inline-block text-primary text-xs font-bold hover:underline">
          العودة للرئيسية
        </Link>
      </div>
    </Wrapper>
  );

  // ── ERROR ────────────────────────────────────────────────────────────────────
  if (stage === 'error') return (
    <Wrapper>
      <div
        className="rounded-2xl p-8 text-center space-y-4"
        style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}
      >
        <XCircle size={40} className="text-red-400 mx-auto" />
        <p className="text-white font-bold">{errMsg}</p>
        <p className="text-white/40 text-xs">تواصل مع الشخص الذي أرسل لك الرابط للحصول على رابط جديد</p>
        <Link href="/" className="inline-block text-primary text-xs font-bold hover:underline">
          العودة للرئيسية
        </Link>
      </div>
    </Wrapper>
  );

  // ── SUCCESS ──────────────────────────────────────────────────────────────────
  if (stage === 'success') return (
    <Wrapper>
      <div
        className="rounded-2xl p-8 text-center space-y-5"
        style={{ background: 'rgba(20,224,164,0.05)', border: '1px solid rgba(20,224,164,0.2)' }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: 'rgba(20,224,164,0.15)', border: '1px solid rgba(20,224,164,0.3)' }}
        >
          <CheckCircle size={30} style={{ color: '#14E0A4' }} />
        </div>
        <div>
          <p className="text-white font-black text-lg">انضممت بنجاح!</p>
          <p className="text-white/50 text-sm mt-1">
            مرحباً بك في <span className="text-white font-bold">{preview?.company_name}</span>
          </p>
        </div>
        <button
          onClick={() => router.push('/workspace')}
          className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)', color: '#050810' }}
        >
          <ArrowRight size={16} /> الذهاب لمساحة العمل
        </button>
      </div>
    </Wrapper>
  );

  // ── JOINING ──────────────────────────────────────────────────────────────────
  if (stage === 'joining') return (
    <Wrapper>
      <div
        className="rounded-2xl p-8 text-center space-y-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Loader2 size={28} className="text-primary animate-spin mx-auto" />
        <p className="text-white/60 text-sm">جارٍ الانضمام إلى {preview?.company_name}…</p>
      </div>
    </Wrapper>
  );

  // ── PREVIEW ──────────────────────────────────────────────────────────────────
  return (
    <Wrapper>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Top accent */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)' }} />

        <div className="p-7 space-y-6">
          {/* Invite label */}
          <div className="text-center">
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: 'rgba(20,224,164,0.12)', border: '1px solid rgba(20,224,164,0.25)', color: '#14E0A4' }}
            >
              دعوة للانضمام
            </span>
          </div>

          {/* Company card */}
          <div
            className="rounded-xl p-5 flex items-center gap-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* Logo */}
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: 'rgba(20,224,164,0.1)', border: '1px solid rgba(20,224,164,0.2)' }}
            >
              {preview?.company_logo ? (
                <Image
                  src={preview.company_logo}
                  alt={preview.company_name}
                  width={56} height={56}
                  className="object-cover w-full h-full"
                />
              ) : (
                <Building2 size={22} style={{ color: '#14E0A4' }} />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-base truncate">{preview?.company_name}</p>
              {preview?.company_type && (
                <p className="text-white/40 text-xs mt-0.5">{preview.company_type}</p>
              )}
              <div className="flex items-center gap-1 mt-1.5 text-white/30 text-xs">
                <Users size={11} />
                <span>{preview?.members_count} عضو</span>
              </div>
            </div>
          </div>

          {/* Auth state message */}
          {loggedIn ? (
            <p className="text-white/40 text-xs text-center">
              ستنضم كـ <span className="text-white/70 font-bold">موظف</span> — يمكن للمسؤول تغيير دورك لاحقاً
            </p>
          ) : (
            <div
              className="rounded-xl p-4 text-center space-y-1"
              style={{ background: 'rgba(46,139,255,0.08)', border: '1px solid rgba(46,139,255,0.2)' }}
            >
              <p className="text-blue-300 text-sm font-bold">تسجيل الدخول مطلوب</p>
              <p className="text-white/40 text-xs">ستعود لهذه الصفحة بعد تسجيل الدخول تلقائياً</p>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleJoin}
            className="w-full py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)', color: '#050810' }}
          >
            {loggedIn
              ? <><UserPlus size={16}/> انضم الآن</>
              : <><LogIn size={16}/> تسجيل الدخول للانضمام</>
            }
          </button>

          <p className="text-white/20 text-[11px] text-center">
            بالانضمام توافق على شروط الاستخدام وسياسة الخصوصية
          </p>
        </div>
      </div>
    </Wrapper>
  );
}
