'use client';

import { useRouter } from 'next/navigation';
import { Info, CreditCard, LayoutDashboard } from 'lucide-react';

export default function SubscriptionCancelPage() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      dir="rtl"
      style={{ background: '#0A0A0F' }}
    >
      {/* Subtle blue glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-10 blur-[100px]"
          style={{ background: 'radial-gradient(circle,#2E8BFF,transparent)' }}
        />
      </div>

      <div
        className="relative z-10 w-full max-w-md p-8 rounded-3xl text-center"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Info icon */}
        <div className="flex justify-center mb-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(46,139,255,0.1)',
              border: '1px solid rgba(46,139,255,0.3)',
            }}
          >
            <Info size={40} style={{ color: '#2E8BFF' }} />
          </div>
        </div>

        <h1 className="text-white font-black text-2xl mb-2">
          تم إلغاء عملية الدفع
        </h1>

        <p className="text-white/40 text-sm mb-8">
          يمكنك الاشتراك في أي وقت — بياناتك محفوظة وجاهزة
        </p>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/subscribe')}
            className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(90deg,#2E8BFF,#00D4FF)',
              boxShadow: '0 0 20px rgba(46,139,255,0.25)',
            }}
          >
            <CreditCard size={16} />
            العودة إلى الاشتراكات
          </button>

          <button
            onClick={() => router.push('/workspace')}
            className="w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 text-white/50 hover:text-white transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <LayoutDashboard size={16} />
            الذهاب إلى لوحة التحكم
          </button>
        </div>
      </div>
    </div>
  );
}
