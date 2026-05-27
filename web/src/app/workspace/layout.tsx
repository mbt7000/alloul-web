'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, isAuthenticated } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';
import { AlertTriangle, X, CreditCard } from 'lucide-react';
import IncomingCallOverlay from '@/components/IncomingCallOverlay';

// ── Billing context (consumed by any workspace page that needs it) ──────────
interface BillingCtx { effectiveStatus: string; daysRemaining: number; }
const BillingContext = createContext<BillingCtx>({ effectiveStatus: 'active', daysRemaining: 0 });
export const useBilling = () => useContext(BillingContext);

// ── Grace banner ─────────────────────────────────────────────────────────────
function GraceBanner({ days, onDismiss }: { days: number; onDismiss: () => void }) {
  const router = useRouter();
  return (
    <div className="relative z-50 w-full px-4 py-2.5 flex items-center gap-3 text-sm"
      style={{ background: 'linear-gradient(90deg,rgba(255,178,77,0.15),rgba(239,68,68,0.1))', borderBottom: '1px solid rgba(255,178,77,0.3)' }}>
      <AlertTriangle size={15} style={{ color: '#FFB24D', flexShrink: 0 }} />
      <p className="text-white/80 flex-1 text-xs leading-tight" dir="rtl">
        <span className="font-black text-yellow-400">تنبيه:</span>{' '}
        اشتراكك منتهٍ — لديك{' '}
        <span className="font-black text-white">{days} {days === 1 ? 'يوم' : 'أيام'}</span>{' '}
        لتجديد الاشتراك قبل إيقاف الخدمة.
      </p>
      <button onClick={() => router.push('/subscribe')}
        className="flex-shrink-0 px-3 py-1 rounded-lg text-[11px] font-black text-black"
        style={{ background: 'linear-gradient(90deg,#FFB24D,#FF8C42)' }}>
        <CreditCard size={11} className="inline ml-1" />
        ادفع الآن
      </button>
      <button onClick={onDismiss} className="flex-shrink-0 text-white/30 hover:text-white/60">
        <X size={14} />
      </button>
    </div>
  );
}

// ── Layout ───────────────────────────────────────────────────────────────────
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked,        setChecked]       = useState(false);
  const [billingStatus,  setBillingStatus] = useState<BillingCtx>({ effectiveStatus: 'active', daysRemaining: 0 });
  const [showBanner,     setShowBanner]    = useState(true);

  useEffect(() => {
    const user = getCachedUser() as any;
    if (!isAuthenticated() || !user) { router.replace('/login'); return; }

    // Step 1: account_type must be set — new users who skipped onboarding go back
    if (!user.account_type) { router.replace('/onboarding'); return; }

    // Step 2: job seekers don't have a company subscription → allow
    if (user.account_type === 'job_seeker') { setChecked(true); return; }

    // Step 3: check company subscription (owners + employees)
    apiFetch('/companies/subscription-status')
      .then((res: any) => {
        const effective = res?.effective_status || res?.status || 'none';
        const days      = res?.days_remaining ?? 0;

        if (effective === 'active' || effective === 'trialing') {
          setBillingStatus({ effectiveStatus: effective, daysRemaining: days });
          setChecked(true);
        } else if (effective === 'grace') {
          setBillingStatus({ effectiveStatus: 'grace', daysRemaining: days });
          setChecked(true);
        } else if (effective === 'suspended') {
          router.replace(`/subscribe?reason=suspended&days=${days}`);
        } else if (effective === 'frozen') {
          router.replace(`/subscribe?reason=frozen&days=${days}`);
        } else if (effective === 'scheduled_deletion') {
          router.replace(`/subscribe?reason=scheduled_deletion&days=${days}`);
        } else if (effective === 'expired') {
          router.replace('/subscribe?reason=expired');
        } else if (effective === 'none') {
          // No subscription at all — owner goes to subscribe, employee has no company yet
          if (user.account_type === 'owner') {
            router.replace('/subscribe');
          } else {
            // employee not yet in a company — send to lobby (not onboarding to avoid redirect loop)
            router.replace('/lobby');
          }
        } else {
          // Fail open on unexpected status (network edge cases)
          setChecked(true);
        }
      })
      .catch(() => {
        // Network error — allow access temporarily (fail open)
        setChecked(true);
      });
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <BillingContext.Provider value={billingStatus}>
      <div className="flex flex-col min-h-screen">
        {billingStatus.effectiveStatus === 'grace' && showBanner && (
          <GraceBanner days={billingStatus.daysRemaining} onDismiss={() => setShowBanner(false)} />
        )}
        {children}
        <IncomingCallOverlay />
      </div>
    </BillingContext.Provider>
  );
}
