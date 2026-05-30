'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  CheckCircle, Loader2, Zap, Shield, Crown,
  Lock, LogOut, AlertTriangle, XCircle, Clock,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { clearToken, getCachedUser } from '@/lib/auth';

const PLANS = [
  {
    id: 'starter', name: 'Starter', priceLabel: '$45', period: '/شهرياً',
    badge: '7 أيام مجاناً',
    color: '#14E0A4', icon: Zap, popular: false, trial: false,
    features: ['حتى 10 موظفين', 'جميع الأدوات الأساسية', 'لوحة التوظيف', 'تقارير أساسية', 'دعم بالبريد'],
    cta: 'ابدأ مجاناً — $45/شهر بعدها',
  },
  {
    id: 'pro', name: 'Professional', priceLabel: '$225', period: '/شهرياً',
    badge: null,
    color: '#2E8BFF', icon: Shield, popular: true, trial: false,
    features: ['حتى 50 موظفاً', 'ALLOUL AI Agent', 'CRM + اجتماعات', 'تقارير متقدمة', 'دعم أولوية 24/7'],
    cta: 'اشترك — $225/شهر',
  },
  {
    id: 'enterprise', name: 'Business', priceLabel: '$289', period: '/شهرياً',
    badge: null,
    color: '#A78BFA', icon: Crown, popular: false, trial: false,
    features: ['موظفون غير محدودين', 'API مفتوح', 'دمج خارجي كامل', 'مدير حساب مخصص', 'SLA 99.9%'],
    cta: 'اشترك — $289/شهر',
  },
];

// ── Banner per reason ─────────────────────────────────────────────────────────
function ReasonBanner({ reason, days }: { reason: string | null; days: number }) {
  if (reason === 'suspended') return (
    <div className="mb-6 p-5 rounded-2xl text-center"
      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
        style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)' }}>
        <AlertTriangle size={26} style={{ color: '#EF4444' }} />
      </div>
      <h2 className="text-white font-black text-lg mb-1">تم إيقاف خدمتك مؤقتاً</h2>
      <p className="text-white/50 text-sm leading-relaxed mb-3">
        انتهت فترة السماح للدفع. لديك{' '}
        <span className="text-red-400 font-black">{days} {days === 1 ? 'يوم' : 'أيام'}</span>{' '}
        لتجديد الاشتراك وإستعادة الوصول الكامل لك ولفريقك.
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
        <Clock size={12} /> بعد {days} {days === 1 ? 'يوم' : 'أيام'} سيتم تعطيل الشركة نهائياً
      </div>
    </div>
  );

  if (reason === 'expired') return (
    <div className="mb-6 p-5 rounded-2xl text-center"
      style={{ background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.3)' }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
        style={{ background: 'rgba(107,114,128,0.15)', border: '1px solid rgba(107,114,128,0.3)' }}>
        <XCircle size={26} className="text-gray-400" />
      </div>
      <h2 className="text-white font-black text-lg mb-1">اشتراك الشركة منتهٍ</h2>
      <p className="text-white/50 text-sm leading-relaxed">
        انتهت مهلة التجديد. حسابك محفوظ — ادفع الاشتراك لإعادة تفعيل شركتك وفريقك فوراً.
      </p>
    </div>
  );

  if (reason === 'frozen') return (
    <div className="mb-6 p-5 rounded-2xl text-center"
      style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)' }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
        style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.35)' }}>
        <XCircle size={26} style={{ color: '#A78BFA' }} />
      </div>
      <h2 className="text-white font-black text-lg mb-1">حسابك مجمّد — بياناتك محفوظة</h2>
      <p className="text-white/50 text-sm leading-relaxed mb-3">
        بيانات شركتك وفريقك <span className="text-purple-400 font-bold">محفوظة بأمان</span>.
        {days > 0 && (
          <> لديك <span className="text-purple-400 font-black">{days} {days === 1 ? 'يوم' : 'أيام'}</span> لإحياء حسابك.</>
        )}
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
        style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#A78BFA' }}>
        <Clock size={12} /> ادفع الآن لإحياء حسابك فوراً دون فقدان البيانات
      </div>
    </div>
  );

  if (reason === 'scheduled_deletion') return (
    <div className="mb-6 p-5 rounded-2xl text-center"
      style={{ background: 'rgba(127,0,0,0.12)', border: '1px solid rgba(239,68,68,0.4)' }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
        style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)' }}>
        <AlertTriangle size={26} style={{ color: '#EF4444' }} />
      </div>
      <h2 className="text-white font-black text-lg mb-1">بياناتك ستُحذف نهائياً</h2>
      <p className="text-white/50 text-sm leading-relaxed mb-3">
        <span className="text-red-400 font-bold">تحذير:</span>{' '}
        {days > 0 ? (
          <>ستُحذف بيانات شركتك خلال <span className="text-red-400 font-black">{days} {days === 1 ? 'يوم' : 'أيام'}</span>. بعد الحذف لا يمكن استرجاعها.</>
        ) : (
          <>بياناتك مجدولة للحذف. ادفع الآن قبل فوات الأوان.</>
        )}
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}>
        <Clock size={12} /> آخر فرصة لحفظ بياناتك
      </div>
    </div>
  );

  // Default — no active subscription
  return (
    <div className="mb-6 p-5 rounded-2xl text-center"
      style={{ background: 'rgba(46,139,255,0.08)', border: '1px solid rgba(46,139,255,0.25)' }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
        style={{ background: 'rgba(46,139,255,0.15)', border: '1px solid rgba(46,139,255,0.35)' }}>
        <Lock size={24} style={{ color: '#2E8BFF' }} />
      </div>
      <h2 className="text-white font-black text-xl mb-1">مساحة العمل مقفلة</h2>
      <p className="text-white/50 text-sm">فعّل اشتراكك للوصول لمساحة عمل شركتك</p>
    </div>
  );
}

// ── Main content ──────────────────────────────────────────────────────────────
function SubscribeContent() {
  const router    = useRouter();
  const params    = useSearchParams();
  const reason    = params.get('reason');
  const days      = parseInt(params.get('days') || '0', 10);
  const user      = getCachedUser() as any;
  const [loading, setLoading] = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const handlePlan = async (plan: typeof PLANS[0]) => {
    setLoading(plan.id); setError(null);
    try {
      const data = await apiFetch<{ checkout_url: string }>(
        '/companies/subscribe',
        { method: 'POST', body: JSON.stringify({ plan_id: plan.id }) }
      );
      window.location.href = data.checkout_url;
    } catch (e: any) {
      if (e?.message?.includes('No company')) router.replace('/onboarding');
      else setError(e?.message || 'خطأ في إنشاء جلسة الدفع');
      setLoading(null);
    }
  };

  const handleLogout = () => { clearToken(); router.replace('/login'); };

  // Suspended, expired, frozen, or scheduled_deletion → highlight pro plan CTA
  const blockedReasons = ['suspended', 'expired', 'frozen', 'scheduled_deletion'];
  const visiblePlans = blockedReasons.includes(reason || '')
    ? PLANS.map(p =>
        (reason === 'frozen' || reason === 'scheduled_deletion') && p.popular
          ? { ...p, cta: 'استعد حسابك فوراً' }
          : p
      )
    : PLANS;

  return (
    <div className="min-h-screen flex flex-col" dir="rtl"
      style={{ background: 'linear-gradient(160deg,#0A0A0F 0%,#0D1220 50%,#0A0A0F 100%)' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/3 w-80 h-80 rounded-full opacity-20 blur-[90px]"
          style={{ background: 'radial-gradient(circle,#2E8BFF,transparent)' }} />
        <div className="absolute bottom-10 right-1/4 w-80 h-80 rounded-full opacity-15 blur-[90px]"
          style={{ background: 'radial-gradient(circle,#A78BFA,transparent)' }} />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <Image src="/icon.png" alt="ALLOUL" width={36} height={36} className="rounded-xl" />
          <span className="text-white font-black text-sm">ALLOUL&Q</span>
        </div>
        {user?.name || user?.username ? (
          <p className="text-white/30 text-xs">
            {user.name || user.username}
          </p>
        ) : null}
        <button onClick={handleLogout}
          className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs transition-colors">
          <LogOut size={13} /> خروج
        </button>
      </div>

      <div className="relative z-10 flex-1 max-w-4xl mx-auto w-full px-4 py-4">

        <ReasonBanner reason={reason} days={days} />

        {/* Plans grid */}
        <div className={`grid gap-4 mb-6 ${visiblePlans.length === 2 ? 'md:grid-cols-2 max-w-2xl mx-auto' : 'md:grid-cols-3'}`}>
          {visiblePlans.map((plan) => {
            const Icon = plan.icon;
            const isLoading = loading === plan.id;
            return (
              <div key={plan.id} className="relative flex flex-col p-5 rounded-2xl"
                style={{
                  background: plan.popular
                    ? 'linear-gradient(135deg,rgba(46,139,255,0.14),rgba(0,212,255,0.07))'
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${plan.popular ? 'rgba(46,139,255,0.45)' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: plan.popular ? '0 0 30px rgba(46,139,255,0.12)' : 'none',
                }}>

                {/* Top badge — "popular" OR "7 days free" */}
                {(plan.popular || plan.badge) && (
                  <div className="absolute -top-3.5 right-1/2 translate-x-1/2">
                    {plan.popular ? (
                      <span className="px-3 py-1 rounded-full text-[11px] font-black text-white whitespace-nowrap"
                        style={{ background: 'linear-gradient(90deg,#2E8BFF,#00D4FF)' }}>
                        {reason ? 'مُوصى لإعادة التفعيل' : 'الأكثر شعبية'}
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[11px] font-black whitespace-nowrap"
                        style={{ background: 'rgba(20,224,164,0.15)', border: '1px solid rgba(20,224,164,0.4)', color: '#14E0A4' }}>
                        {plan.badge}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${plan.color}20`, border: `1px solid ${plan.color}40` }}>
                    <Icon size={16} style={{ color: plan.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-black text-sm">{plan.name}</p>
                    <p className="text-white/40 text-[11px]">{plan.period}</p>
                  </div>
                  <span className="text-white font-black text-xl">{plan.priceLabel}</span>
                </div>

                <ul className="space-y-2 flex-1 mb-4">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-white/60">
                      <CheckCircle size={11} style={{ color: plan.color, flexShrink: 0 }} /> {f}
                    </li>
                  ))}
                </ul>

                <button onClick={() => handlePlan(plan)} disabled={!!loading}
                  className="w-full py-3 rounded-xl font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  style={plan.popular
                    ? { background: `linear-gradient(90deg,${plan.color},#00D4FF)`, color: '#fff', boxShadow: `0 0 16px ${plan.color}40` }
                    : plan.badge
                    ? { background: `linear-gradient(90deg,#14E0A4,#00D4FF)`, color: '#000', boxShadow: '0 0 16px rgba(20,224,164,0.3)' }
                    : { background: `${plan.color}15`, border: `1px solid ${plan.color}30`, color: plan.color }
                  }>
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="text-center text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
            {error}
          </p>
        )}

        {/* Trust line */}
        <div className="flex items-center justify-center gap-5 text-white/25 text-[11px] flex-wrap">
          {['بدون بطاقة في التجربة', 'إلغاء في أي وقت', 'حسابك محفوظ', 'ضمان استرداد 30 يوم'].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle size={10} className="text-accent-500/60" /> {t}
            </span>
          ))}
        </div>

      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense>
      <SubscribeContent />
    </Suspense>
  );
}
