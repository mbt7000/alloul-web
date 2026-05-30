'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getCachedUser, isAuthenticated } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';
import { AlertTriangle, X, CreditCard } from 'lucide-react';
import { CallProvider, useCallContext } from '@/context/CallContext';
import IncomingCallOverlay from '@/components/IncomingCallOverlay';
import OutgoingCallOverlay from '@/components/OutgoingCallOverlay';

const MeetingRoomOverlay = dynamic(
  () => import('./meetings/MeetingRoomOverlay'),
  { ssr: false }
);

// ── Billing context ───────────────────────────────────────────────────────────
interface BillingCtx { effectiveStatus: string; daysRemaining: number; }
const BillingContext = createContext<BillingCtx>({ effectiveStatus: 'active', daysRemaining: 0 });
export const useBilling = () => useContext(BillingContext);

// ── Grace banner ──────────────────────────────────────────────────────────────
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

// ── Call overlays (rendered inside CallProvider) ──────────────────────────────
function CallOverlays() {
  const { mode, activeRoom, endCall } = useCallContext();
  return (
    <>
      <IncomingCallOverlay />
      <OutgoingCallOverlay />
      {mode === 'active' && activeRoom && (
        <MeetingRoomOverlay room={activeRoom} onLeave={endCall} />
      )}
    </>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked,       setChecked]      = useState(false);
  const [billingStatus, setBillingStatus] = useState<BillingCtx>({ effectiveStatus: 'active', daysRemaining: 0 });
  const [showBanner,    setShowBanner]   = useState(true);

  useEffect(() => {
    const user = getCachedUser() as any;
    if (!isAuthenticated() || !user) { router.replace('/login'); return; }
    if (!user.account_type)          { router.replace('/onboarding'); return; }
    if (user.account_type === 'job_seeker') { setChecked(true); return; }

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
        } else if (effective === 'suspended')         { router.replace(`/subscribe?reason=suspended&days=${days}`);
        } else if (effective === 'frozen')            { router.replace(`/subscribe?reason=frozen&days=${days}`);
        } else if (effective === 'scheduled_deletion'){ router.replace(`/subscribe?reason=scheduled_deletion&days=${days}`);
        } else if (effective === 'expired')           { router.replace('/subscribe?reason=expired');
        } else if (effective === 'none') {
          user.account_type === 'owner' ? router.replace('/subscribe') : router.replace('/lobby');
        } else {
          setChecked(true);
        }
      })
      .catch(() => setChecked(true));
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
      <CallProvider>
        <div className="flex flex-col min-h-screen">
          {billingStatus.effectiveStatus === 'grace' && showBanner && (
            <GraceBanner days={billingStatus.daysRemaining} onDismiss={() => setShowBanner(false)} />
          )}
          {children}
          <CallOverlays />
        </div>
      </CallProvider>
    </BillingContext.Provider>
  );
}
