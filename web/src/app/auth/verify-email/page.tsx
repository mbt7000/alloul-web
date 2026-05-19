'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Mail, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { verifyEmail, resendVerification } from '@/lib/api-client';
import { setToken, setCachedUser } from '@/lib/auth';
import { getCurrentUser } from '@/lib/api-client';

type Phase =
  | { kind: 'verifying' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }
  | { kind: 'waiting'; email: string };

function VerifyEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [phase, setPhase] = useState<Phase>({ kind: 'verifying' });
  const [resending, setResending] = useState(false);
  const [resentDone, setResentDone] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = params.get('token');
    const email = params.get('email');

    if (token) {
      verifyEmail(token)
        .then(async (res) => {
          setToken(res.access_token);
          try {
            const me = await getCurrentUser();
            setCachedUser(me);
          } catch {}
          setPhase({ kind: 'success' });
          setTimeout(() => router.replace('/'), 1800);
        })
        .catch((err: any) => {
          setPhase({
            kind: 'error',
            message: err?.message === 'HTTP 400'
              ? 'الرابط منتهي الصلاحية أو غير صالح.'
              : (err?.message || 'فشل التحقق. حاول مجددًا.'),
          });
        });
    } else if (email) {
      setPhase({ kind: 'waiting', email });
    } else {
      router.replace('/login');
    }
  }, [params, router]);

  const handleResend = async (email: string) => {
    if (resending || resentDone) return;
    setResending(true);
    try {
      await resendVerification(email);
    } catch {}
    setResending(false);
    setResentDone(true);
    setTimeout(() => setResentDone(false), 5000);
  };

  return (
    <div className="bg-[#111111] border border-white/[0.08] rounded-2xl p-8 shadow-2xl">

      {/* ── Verifying ─────────────────────────────────── */}
      {phase.kind === 'verifying' && (
        <div className="flex flex-col items-center gap-4 py-6">
          <Loader2 className="w-10 h-10 text-[#6366f1] animate-spin" />
          <p className="text-white/70 text-sm">جارٍ التحقق من بريدك…</p>
        </div>
      )}

      {/* ── Success ───────────────────────────────────── */}
      {phase.kind === 'success' && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white">تم التحقق بنجاح!</h2>
          <p className="text-white/50 text-sm">جارٍ تحويلك إلى لوحة التحكم…</p>
          <Loader2 className="w-5 h-5 text-white/30 animate-spin mt-2" />
        </div>
      )}

      {/* ── Error ─────────────────────────────────────── */}
      {phase.kind === 'error' && (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">فشل التحقق</h2>
          <p className="text-white/50 text-sm">{phase.message}</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-2 w-full h-11 rounded-xl bg-[#6366f1] hover:bg-[#4f52d9] text-white text-sm font-semibold transition-colors"
          >
            العودة لتسجيل الدخول
          </button>
        </div>
      )}

      {/* ── Waiting (check inbox) ─────────────────────── */}
      {phase.kind === 'waiting' && (
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="relative w-20 h-20 rounded-2xl bg-[#1a1a2e] border border-white/10 flex items-center justify-center">
            <Mail className="w-9 h-9 text-[#6366f1]" />
            <span className="absolute top-2.5 right-2.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-[#111111]" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-2">تحقق من بريدك الإلكتروني</h2>
            <p className="text-white/50 text-sm leading-relaxed">أرسلنا رابط التحقق إلى</p>
            <span className="inline-block mt-2 px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[#6366f1] text-sm font-semibold">
              {phase.email}
            </span>
          </div>

          <p className="text-white/40 text-xs leading-relaxed px-2">
            افتح الرابط في رسالة البريد الإلكتروني لتفعيل حسابك.
            قد تجد الرسالة في مجلد الرسائل غير المرغوب فيها.
          </p>

          <div className="w-full h-px bg-white/[0.06]" />

          <button
            onClick={() => handleResend(phase.email)}
            disabled={resending || resentDone}
            className={`w-full h-11 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2
              ${resentDone
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-[#6366f1]/50 text-[#6366f1] hover:bg-[#6366f1]/10'
              }`}
          >
            {resending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : resentDone ? (
              <><CheckCircle className="w-4 h-4" /> تم الإرسال</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> إعادة إرسال البريد</>
            )}
          </button>

          <button
            onClick={() => router.push('/login')}
            className="text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            ← العودة لتسجيل الدخول
          </button>
        </div>
      )}

    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <span className="text-2xl font-bold tracking-tight text-white">
            ALLOUL<span className="text-[#6366f1]">&amp;Q</span>
          </span>
        </div>
        <Suspense fallback={
          <div className="bg-[#111111] border border-white/[0.08] rounded-2xl p-8 flex justify-center">
            <Loader2 className="w-8 h-8 text-[#6366f1] animate-spin" />
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </main>
  );
}
