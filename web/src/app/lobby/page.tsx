'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Clock, CheckCircle, XCircle, Loader2, RefreshCw, Building2, LogOut, Hash, Copy, Check, Bell } from 'lucide-react';
import { isAuthenticated, clearToken, getCachedUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';

type JoinStatus = 'pending' | 'accepted' | 'rejected' | null;

interface JoinRequest {
  id: number;
  company_id: number;
  company_name: string;
  company_logo: string | null;
  status: JoinStatus;
  message: string | null;
  created_at: string;
}

interface PendingInvitation {
  id: number;
  company_id: number;
  company_name: string;
  inviter_name?: string | null;
  role: string;
  created_at?: string | null;
}

export default function LobbyPage() {
  const router = useRouter();
  const [joinRequest, setJoinRequest] = useState<JoinRequest | null>(null);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dots, setDots] = useState('');
  const [invAction, setInvAction] = useState<number | null>(null); // invitation id being actioned
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) router.replace('/login');
  }, [router]);

  const fetchStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [res, invRes] = await Promise.all([
        apiFetch('/companies/my-join-status').catch(() => null) as Promise<JoinRequest | null>,
        apiFetch('/companies/invitations').catch(() => []) as Promise<PendingInvitation[]>,
      ]);
      setJoinRequest(res);
      setInvitations(Array.isArray(invRes) ? invRes : []);

      if (res?.status === 'accepted') {
        setTimeout(() => {
          localStorage.setItem('alloul_onboarding_done', 'true');
          router.replace('/');
        }, 2000);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => fetchStatus(true), 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Animated dots for pending state
  useEffect(() => {
    if (joinRequest?.status !== 'pending') return;
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 600);
    return () => clearInterval(t);
  }, [joinRequest?.status]);

  const [copied, setCopied] = useState(false);
  const user = getCachedUser() as any;
  const userICode = user?.i_code || '';

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem('alloul_onboarding_done');
    document.cookie = 'alloul_auth=; path=/; max-age=0';
    router.push('/login');
  };

  const handleChangeType = () => {
    localStorage.removeItem('alloul_onboarding_done');
    router.replace('/onboarding');
  };

  const copyCode = () => {
    if (userICode) { navigator.clipboard.writeText(userICode); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleAccept = async (inv: PendingInvitation) => {
    setInvAction(inv.id);
    try {
      await apiFetch(`/companies/invitations/${inv.id}/accept`, { method: 'POST' });
      setAccepted(true);
      setTimeout(() => {
        localStorage.setItem('alloul_onboarding_done', 'true');
        router.replace('/');
      }, 2000);
    } catch (e: any) {
      alert(e?.message || 'حدث خطأ، حاول مجدداً');
    } finally {
      setInvAction(null);
    }
  };

  const handleReject = async (inv: PendingInvitation) => {
    setInvAction(inv.id);
    try {
      await apiFetch(`/companies/invitations/${inv.id}/reject`, { method: 'POST' });
      setInvitations(prev => prev.filter(i => i.id !== inv.id));
    } catch (e: any) {
      alert(e?.message || 'حدث خطأ، حاول مجدداً');
    } finally {
      setInvAction(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Loader2 size={32} className="animate-spin text-white/40" />
      </div>
    );
  }

  // ── ACCEPTED (invitation) ──
  if (accepted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4" dir="rtl" style={{ background: '#0A0A0F' }}>
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 rounded-full animate-ping"
            style={{ background: 'rgba(20,224,164,0.2)', animationDuration: '1s', animationIterationCount: 3 }} />
          <div className="absolute inset-0 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(20,224,164,0.15)', border: '1px solid rgba(20,224,164,0.4)' }}>
            <CheckCircle size={40} style={{ color: '#14E0A4' }} />
          </div>
        </div>
        <h1 className="text-white font-black text-2xl mb-3">مبروك! تم القبول 🎉</h1>
        <p className="text-white/60 text-sm mb-6 max-w-xs leading-relaxed">
          انضممت إلى الشركة بنجاح. يتم تحويلك لمساحة العمل الآن...
        </p>
        <Loader2 size={24} className="animate-spin" style={{ color: '#14E0A4' }} />
      </div>
    );
  }

  // ── PENDING INVITATIONS — show these first, they're more actionable ──
  if (invitations.length > 0) {
    return (
      <div className="min-h-screen flex flex-col" dir="rtl" style={{ background: '#0A0A0F' }}>
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px]"
            style={{ background: 'rgba(20,224,164,0.08)' }} />
        </div>

        {/* Header */}
        <div className="relative z-10 px-4 pt-6 pb-4 flex items-center justify-between">
          <span className="text-white font-black text-base">ALLOUL&Q</span>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs transition-colors">
            <LogOut size={14} /> خروج
          </button>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-8 max-w-sm mx-auto w-full">
          {/* Icon */}
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
            style={{ background: 'rgba(20,224,164,0.12)', border: '1px solid rgba(20,224,164,0.35)' }}>
            <Bell size={34} style={{ color: '#14E0A4' }} />
          </div>

          <h1 className="text-white font-black text-2xl mb-2 text-center">لديك دعوة!</h1>
          <p className="text-white/50 text-sm mb-8 text-center leading-relaxed">
            وصلتك دعوة للانضمام إلى شركة — وافق أو ارفض
          </p>

          {/* Invitation cards */}
          <div className="w-full space-y-4">
            {invitations.map(inv => (
              <div key={inv.id} className="w-full p-5 rounded-2xl"
                style={{ background: 'rgba(20,224,164,0.07)', border: '1.5px solid rgba(20,224,164,0.3)' }}>
                {/* Company info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(46,139,255,0.15)', border: '1px solid rgba(46,139,255,0.3)' }}>
                    <Building2 size={22} style={{ color: '#2E8BFF' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-base truncate">{inv.company_name}</p>
                    {inv.inviter_name && (
                      <p className="text-white/40 text-xs mt-0.5">دعاك {inv.inviter_name}</p>
                    )}
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full flex-shrink-0"
                    style={{ background: 'rgba(20,224,164,0.15)', color: '#14E0A4', border: '1px solid rgba(20,224,164,0.3)' }}>
                    {inv.role === 'employee' ? 'موظف' : inv.role === 'manager' ? 'مدير' : inv.role === 'supervisor' ? 'مشرف' : inv.role}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReject(inv)}
                    disabled={invAction === inv.id}
                    className="flex-1 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                    style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444', background: 'rgba(239,68,68,0.07)' }}>
                    {invAction === inv.id ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'رفض'}
                  </button>
                  <button
                    onClick={() => handleAccept(inv)}
                    disabled={invAction === inv.id}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #14E0A4, #00B87C)', boxShadow: '0 4px 15px rgba(20,224,164,0.3)' }}>
                    {invAction === inv.id ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'قبول ✓'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* i_code */}
          {userICode && (
            <div className="w-full mt-6 p-4 rounded-2xl text-center"
              style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}>
              <p className="text-white/30 text-xs mb-1">رقم ID الخاص بك</p>
              <p className="text-white/60 font-black text-xl tracking-widest" style={{ fontFamily: 'monospace' }}>
                {userICode}
              </p>
            </div>
          )}

          <button onClick={() => fetchStatus(false)} disabled={refreshing}
            className="w-full mt-4 flex items-center justify-center gap-2 text-white/50 text-sm py-2 transition-colors">
            {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            تحديث
          </button>
        </div>
      </div>
    );
  }

  // ── No invitations + no join request ──
  if (!joinRequest) {
    return (
      <div className="min-h-screen flex flex-col" dir="rtl" style={{ background: '#0A0A0F' }}>
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/15 blur-[120px]" />
        </div>

        {/* Header */}
        <div className="relative z-10 px-4 pt-6 pb-4 flex items-center justify-between">
          <span className="text-white font-black text-base">ALLOUL&Q</span>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs transition-colors">
            <LogOut size={14} /> خروج
          </button>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-8 max-w-sm mx-auto w-full">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
            style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)' }}>
            <Hash size={36} style={{ color: '#A78BFA' }} />
          </div>

          <h1 className="text-white font-black text-2xl mb-2 text-center">في انتظار الإضافة</h1>
          <p className="text-white/50 text-sm mb-6 text-center leading-relaxed">
            شارك رقمك الوظيفي مع مسؤول شركتك ليضيفك لمساحة العمل
          </p>

          {/* i_code display */}
          {userICode && (
            <div className="w-full p-5 rounded-2xl mb-6 text-center"
              style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)' }}>
              <p className="text-white/40 text-xs mb-2">رقم ID الخاص بك</p>
              <p className="text-white font-black text-3xl tracking-widest mb-3" style={{ fontFamily: 'monospace' }}>
                {userICode}
              </p>
              <button onClick={copyCode}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={{ background: copied ? 'rgba(20,224,164,0.15)' : 'rgba(167,139,250,0.15)', color: copied ? '#14E0A4' : '#A78BFA', border: `1px solid ${copied ? 'rgba(20,224,164,0.3)' : 'rgba(167,139,250,0.3)'}` }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'تم النسخ' : 'انسخ الرقم'}
              </button>
            </div>
          )}

          <div className="w-full space-y-3">
            <button onClick={() => fetchStatus(false)}
              className="w-full flex items-center justify-center gap-2 text-white font-bold rounded-2xl py-3.5 transition-colors"
              style={{ background: 'rgba(46,139,255,0.15)', border: '1px solid rgba(46,139,255,0.3)', color: '#2E8BFF' }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              تحقق من الحالة
            </button>
            <button onClick={handleChangeType}
              className="w-full text-white/60 font-bold rounded-2xl py-3.5 transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              تغيير نوع الحساب
            </button>
            <button onClick={handleLogout}
              className="w-full text-red-400/70 font-bold rounded-2xl py-3 transition-colors text-sm"
              style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <LogOut size={14} className="inline ml-1" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col" dir="rtl">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-secondary/10 blur-[140px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 px-4 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10">
            <Image src="/icon.png" alt="ALLOUL" width={40} height={40} />
          </div>
          <span className="text-white font-black text-base">ALLOUL&Q</span>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/60 text-xs transition-colors">
          <LogOut size={14} /> خروج
        </button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col px-4 pb-8 max-w-lg mx-auto w-full">

        {/* ── PENDING ── */}
        {joinRequest.status === 'pending' && (
          <>
            <div className="flex flex-col items-center text-center mt-8 mb-8">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: 'rgba(255,178,77,0.15)', animationDuration: '2s' }} />
                <div className="absolute inset-2 rounded-full animate-pulse"
                  style={{ background: 'rgba(255,178,77,0.1)' }} />
                <div className="absolute inset-0 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,178,77,0.15)', border: '1px solid rgba(255,178,77,0.4)' }}>
                  <Clock size={36} style={{ color: '#FFB24D' }} />
                </div>
              </div>
              <h1 className="text-white font-black text-2xl mb-2">
                في انتظار الموافقة{dots}
              </h1>
              <p className="text-white/50 text-sm max-w-xs leading-relaxed">
                طلبك وصل لمسؤول الشركة. ستُحوَّل تلقائياً فور القبول.
              </p>
            </div>

            <div className="glass-strong p-5 rounded-2xl mb-4"
              style={{ border: '1px solid rgba(255,178,77,0.2)' }}>
              <div className="flex items-center gap-4 mb-4">
                {joinRequest.company_logo ? (
                  <img src={joinRequest.company_logo} alt="" className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(46,139,255,0.15)', border: '1px solid rgba(46,139,255,0.3)' }}>
                    <Building2 size={22} style={{ color: '#2E8BFF' }} />
                  </div>
                )}
                <div>
                  <p className="text-white/40 text-xs">طلب انضمام إلى</p>
                  <p className="text-white font-black text-lg">{joinRequest.company_name}</p>
                </div>
                <div className="mr-auto">
                  <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-bold px-3 py-1 rounded-full">
                    قيد المراجعة
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-right border-t border-white/5 pt-4">
                {[
                  { label: 'تاريخ الطلب', value: new Date(joinRequest.created_at).toLocaleDateString('ar-SA') },
                  { label: 'الحالة', value: 'في انتظار مسؤول الشركة' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-white/40 text-xs">{label}</span>
                    <span className="text-white/70 text-xs font-bold">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => fetchStatus(true)} disabled={refreshing}
              className="w-full glass glass-hover text-white/70 font-bold rounded-2xl py-3 flex items-center justify-center gap-2 transition-all">
              {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              تحديث الحالة
            </button>
          </>
        )}

        {/* ── ACCEPTED ── */}
        {joinRequest.status === 'accepted' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 rounded-full animate-ping"
                style={{ background: 'rgba(20,224,164,0.2)', animationDuration: '1s', animationIterationCount: 3 }} />
              <div className="absolute inset-0 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(20,224,164,0.15)', border: '1px solid rgba(20,224,164,0.4)' }}>
                <CheckCircle size={40} style={{ color: '#14E0A4' }} />
              </div>
            </div>
            <h1 className="text-white font-black text-2xl mb-3">مبروك! تم القبول 🎉</h1>
            <p className="text-white/60 text-sm mb-6 max-w-xs leading-relaxed">
              تم قبولك في <strong className="text-white">{joinRequest.company_name}</strong>. يتم تحويلك لمساحة العمل الآن...
            </p>
            <Loader2 size={24} className="animate-spin text-accent-500" />
          </div>
        )}

        {/* ── REJECTED ── */}
        {joinRequest.status === 'rejected' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <XCircle size={40} style={{ color: '#EF4444' }} />
            </div>
            <h1 className="text-white font-black text-2xl mb-3">تعذّر قبول الطلب</h1>
            <p className="text-white/50 text-sm mb-6 max-w-xs leading-relaxed">
              لم يتم قبول طلبك في {joinRequest.company_name} في الوقت الحالي.
            </p>
            <div className="w-full space-y-3">
              <button onClick={() => router.replace('/onboarding')}
                className="w-full text-white font-black rounded-2xl py-3.5"
                style={{ background: 'linear-gradient(90deg,#2E8BFF,#00D4FF)', boxShadow: '0 0 20px rgba(46,139,255,0.3)' }}>
                حاول مجدداً
              </button>
              <button onClick={handleLogout}
                className="w-full glass text-white/60 font-bold rounded-2xl py-3">
                تسجيل خروج
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
