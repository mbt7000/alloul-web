'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';

function planLabel(planId: string | null): string {
  if (!planId) return 'اشتراكك';
  if (planId === 'pro') return 'الاحترافي ($49/شهر)';
  if (planId === 'enterprise') return 'المؤسسي ($199/شهر)';
  if (planId === 'starter') return 'التجربة المجانية';
  return planId;
}

function SuccessContent() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get('plan');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) {
      router.push('/workspace');
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      dir="rtl"
      style={{ background: '#0A0A0F' }}
    >
      {/* Green glow */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 blur-[120px]"
          style={{ background: 'radial-gradient(circle,#14E0A4,transparent)' }}
        />
      </div>

      <div
        className="relative z-10 w-full max-w-md p-8 rounded-3xl text-center"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(20,224,164,0.2)',
          boxShadow: '0 0 60px rgba(20,224,164,0.08)',
        }}
      >
        {/* Animated checkmark */}
        <div className="flex justify-center mb-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(20,224,164,0.12)',
              border: '1px solid rgba(20,224,164,0.35)',
              boxShadow: '0 0 30px rgba(20,224,164,0.2)',
            }}
          >
            <CheckCircle size={40} style={{ color: '#14E0A4' }} />
          </div>
        </div>

        <h1 className="text-white font-black text-2xl mb-2">
          تم تفعيل اشتراكك بنجاح!
        </h1>

        <p className="text-white/50 text-sm mb-1">
          خطة{' '}
          <span className="text-white font-bold">{planLabel(plan)}</span>
        </p>

        <p className="text-white/30 text-xs mb-8">
          ستصلك رسالة تأكيد على بريدك الإلكتروني قريباً
        </p>

        <button
          onClick={() => router.push('/workspace')}
          className="w-full py-3.5 rounded-xl font-black text-sm text-white mb-4 flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(90deg,#14E0A4,#00D4FF)',
            boxShadow: '0 0 20px rgba(20,224,164,0.3)',
          }}
        >
          الذهاب إلى مساحة العمل
        </button>

        <p className="text-white/20 text-xs">
          سيتم التحويل تلقائياً خلال {countdown} ثوانٍ...
        </p>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
          <Loader2 size={32} className="animate-spin text-white/30" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
