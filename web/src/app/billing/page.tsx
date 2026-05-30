'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard, Clock, CheckCircle, AlertTriangle, XCircle,
  Loader2, RefreshCw, Shield, History, ExternalLink,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import AppShell from '@/components/AppShell';

// ── Types ─────────────────────────────────────────────────────────────────────
interface BillingStatus {
  effective_status: string;
  days_remaining: number;
  plan_id: string | null;
  period_end: string | null;
  dunning_step: number;
}

interface BillingEvent {
  id: number;
  event_type: string;
  description: string | null;
  created_at: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function planName(planId: string | null): string {
  if (!planId) return 'غير معروف';
  if (planId.includes('trial')) return 'تجربة مجانية';
  if (planId === 'starter') return 'Starter — $45/شهر';
  if (planId === 'pro') return 'Professional — $225/شهر';
  if (planId === 'enterprise' || planId === 'pro_plus' || planId === 'business') return 'Business — $289/شهر';
  return planId;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return iso; }
}

function eventLabel(type: string): string {
  const map: Record<string, string> = {
    dunning_1: 'تذكير #1',
    dunning_2: 'تذكير #2',
    dunning_3: 'تذكير #3',
    dunning_4: 'تحذير نهائي',
    dunning_frozen: 'تذكير تجميد',
    status_change: 'تغيير الحالة',
    payment_received: 'دفعة مستلمة',
    data_deleted: 'بيانات محذوفة',
    reactivated: 'إعادة تفعيل',
  };
  return map[type] || type;
}

// ── Status badge ──────────────────────────────────────────────────────────────
interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}

function getStatusConfig(status: string, days: number): StatusConfig {
  switch (status) {
    case 'active':
      return { label: 'نشط', color: '#14E0A4', bg: 'rgba(20,224,164,0.1)', border: 'rgba(20,224,164,0.3)', icon: <CheckCircle size={16} style={{ color: '#14E0A4' }} /> };
    case 'trialing':
      return { label: 'تجربة مجانية', color: '#14E0A4', bg: 'rgba(20,224,164,0.1)', border: 'rgba(20,224,164,0.3)', icon: <Shield size={16} style={{ color: '#14E0A4' }} /> };
    case 'grace':
      return { label: `فترة السماح — ${days} ${days === 1 ? 'يوم' : 'أيام'}`, color: '#FFB24D', bg: 'rgba(255,178,77,0.1)', border: 'rgba(255,178,77,0.3)', icon: <Clock size={16} style={{ color: '#FFB24D' }} /> };
    case 'suspended':
      return { label: 'موقوف', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: <AlertTriangle size={16} style={{ color: '#EF4444' }} /> };
    case 'frozen':
      return { label: 'مجمّد', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)', icon: <XCircle size={16} style={{ color: '#A78BFA' }} /> };
    case 'scheduled_deletion':
      return { label: `حذف خلال ${days} ${days === 1 ? 'يوم' : 'أيام'}`, color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.4)', icon: <XCircle size={16} style={{ color: '#EF4444' }} /> };
    case 'deleted':
      return { label: 'محذوف', color: '#6B7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)', icon: <XCircle size={16} style={{ color: '#6B7280' }} /> };
    default:
      return { label: status || 'غير معروف', color: '#6B7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)', icon: <Clock size={16} style={{ color: '#6B7280' }} /> };
  }
}

// ── Progress bar (days remaining in phase) ────────────────────────────────────
function phaseTotal(status: string): number {
  switch (status) {
    case 'grace': return 10;
    case 'suspended': return 3;
    case 'frozen': return 30;
    case 'scheduled_deletion': return 15;
    default: return 0;
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const router = useRouter();
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [history, setHistory] = useState<BillingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/billing/status');
      setBillingStatus(data);
    } catch (e: any) {
      setError(e?.message || 'خطأ في تحميل بيانات الاشتراك');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await apiFetch('/billing/history');
      setHistory(data || []);
    } catch {
      // history is optional — ignore error
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const data = await apiFetch<{ portal_url: string }>('/companies/billing-portal', { method: 'POST' });
      window.location.href = data.portal_url;
    } catch (e: any) {
      // portal not available (no stripe customer yet) — go to subscribe
      router.push('/subscribe');
    } finally {
      setPortalLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchHistory();
  }, []);

  const statusCfg = billingStatus ? getStatusConfig(billingStatus.effective_status, billingStatus.days_remaining) : null;
  const total = billingStatus ? phaseTotal(billingStatus.effective_status) : 0;
  const progressPct = total > 0 ? Math.max(0, Math.min(100, (billingStatus!.days_remaining / total) * 100)) : 0;

  return (
    <AppShell>
      <div className="min-h-screen p-4 md:p-8" style={{ background: '#0A0A0F' }} dir="rtl">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-white font-black text-2xl mb-1 flex items-center gap-2">
                <CreditCard size={24} style={{ color: '#2E8BFF' }} />
                الاشتراك والفوترة
              </h1>
              <p className="text-white/40 text-sm">إدارة اشتراك شركتك وعرض سجل الفوترة</p>
            </div>
            <button
              onClick={() => { fetchStatus(); fetchHistory(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <RefreshCw size={14} />
              تحديث
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={32} className="animate-spin text-white/30" />
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : billingStatus && statusCfg ? (
            <>
              {/* Status card */}
              <div className="p-6 rounded-2xl mb-6"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>

                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-white/40 text-xs mb-2">الخطة الحالية</p>
                    <p className="text-white font-black text-xl">{planName(billingStatus.plan_id)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color }}>
                    {statusCfg.icon}
                    {statusCfg.label}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-white/40 text-xs mb-1">تاريخ التجديد</p>
                    <p className="text-white font-bold text-sm">{formatDate(billingStatus.period_end)}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-white/40 text-xs mb-1">الأيام المتبقية</p>
                    <p className="font-bold text-sm" style={{ color: statusCfg.color }}>
                      {billingStatus.days_remaining} {billingStatus.days_remaining === 1 ? 'يوم' : 'أيام'}
                    </p>
                  </div>
                </div>

                {/* Progress bar — only show in warning phases */}
                {total > 0 && (
                  <div className="mb-5">
                    <div className="flex justify-between text-xs text-white/40 mb-1.5">
                      <span>المتبقي في المرحلة الحالية</span>
                      <span>{billingStatus.days_remaining}/{total} يوم</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-2 rounded-full transition-all duration-700"
                        style={{ width: `${progressPct}%`, background: `linear-gradient(90deg,${statusCfg.color},${statusCfg.color}88)` }} />
                    </div>
                  </div>
                )}

                {/* CTA */}
                {['grace', 'suspended', 'frozen', 'scheduled_deletion'].includes(billingStatus.effective_status) && (
                  <button
                    onClick={() => router.push(`/subscribe?reason=${billingStatus.effective_status}&days=${billingStatus.days_remaining}`)}
                    className="w-full py-3 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(90deg,#2E8BFF,#00D4FF)', boxShadow: '0 0 20px rgba(46,139,255,0.3)' }}
                  >
                    <CreditCard size={16} />
                    جدّد الاشتراك
                  </button>
                )}

                {/* Stripe Portal — only for active/trialing Stripe subscriptions */}
                {(billingStatus.effective_status === 'active' || billingStatus.effective_status === 'trialing') && billingStatus.plan_id && !billingStatus.plan_id.includes('trial') && (
                  <button
                    onClick={handleOpenPortal}
                    disabled={portalLoading}
                    className="w-full mt-3 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white/60 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                    إدارة طريقة الدفع والفاتورة
                  </button>
                )}
              </div>

              {/* Billing history */}
              <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 className="text-white font-black text-base mb-4 flex items-center gap-2">
                  <History size={16} style={{ color: '#2E8BFF' }} />
                  سجل الفوترة
                </h2>

                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-white/30" />
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-white/30 text-sm text-center py-8">لا يوجد سجل فوترة بعد</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((event) => (
                      <div key={event.id}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-bold">{eventLabel(event.event_type)}</p>
                          {event.description && (
                            <p className="text-white/40 text-xs mt-0.5 truncate">{event.description}</p>
                          )}
                        </div>
                        <p className="text-white/30 text-xs flex-shrink-0 mr-3">{formatDate(event.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}

        </div>
      </div>
    </AppShell>
  );
}
