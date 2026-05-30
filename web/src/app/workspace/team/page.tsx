'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Loader2, Users, Clock, CheckCircle, XCircle, UserPlus, X, Mail, Send, MessageCircle } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getCompanyMembers, ApiError, type CompanyMember, apiFetch } from '@/lib/api-client';
import { isAuthenticated, clearToken, getCachedUser } from '@/lib/auth';

interface JoinRequestItem {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
  message: string | null;
  created_at: string;
}

const ROLE_META: Record<string, { label: string; color: string; order: number }> = {
  owner:    { label: 'المالك',    color: '#F59E0B', order: 0 },
  admin:    { label: 'المشرفون',  color: '#EF4444', order: 1 },
  manager:  { label: 'المدراء',   color: '#8B5CF6', order: 2 },
  employee: { label: 'الموظفون',  color: '#2E8BFF', order: 3 },
  member:   { label: 'الأعضاء',   color: '#6B7280', order: 4 },
};

export default function TeamHierarchyPage() {
  const router = useRouter();
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequestItem[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [dmLoading, setDmLoading] = useState<number | null>(null);

  const user = getCachedUser() as any;
  const isAdmin = ['owner', 'admin', 'manager'].includes(user?.role ?? '');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const [membersRes, jrRes] = await Promise.allSettled([
          getCompanyMembers(),
          apiFetch('/companies/join-requests'),
        ]);
        if (!mounted) return;
        if (membersRes.status === 'fulfilled') setMembers(Array.isArray(membersRes.value) ? membersRes.value : []);
        if (jrRes.status === 'fulfilled') setJoinRequests(Array.isArray(jrRes.value) ? jrRes.value as JoinRequestItem[] : []);
      } catch (e: any) {
        if (e instanceof ApiError && e.status === 401) {
          clearToken();
          router.replace('/login');
          return;
        }
        if (mounted) setError(e?.message || 'فشل تحميل الفريق');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  const handleJoinAction = async (id: number, action: 'accept' | 'reject') => {
    setActionLoading(id);
    try {
      await apiFetch(`/companies/join-requests/${id}/${action}`, { method: 'POST' });
      setJoinRequests(prev => prev.filter(r => r.id !== id));
      if (action === 'accept') {
        const data = await getCompanyMembers();
        setMembers(Array.isArray(data) ? data : []);
      }
    } catch { } finally {
      setActionLoading(null);
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true); setInviteMsg('');
    try {
      await apiFetch('/companies/invite', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      setInviteMsg('تم إرسال الدعوة بنجاح');
      setInviteEmail('');
      setTimeout(() => { setInviteMsg(''); setShowInvite(false); }, 2000);
    } catch (e: any) {
      setInviteMsg(e?.detail || 'فشل إرسال الدعوة');
    } finally { setInviting(false); }
  };

  const openDm = async (memberId: number) => {
    setDmLoading(memberId);
    try {
      await apiFetch('/chat/dm', { method: 'POST', body: JSON.stringify({ target_user_id: memberId }) });
      router.push('/workspace/chat');
    } catch { } finally { setDmLoading(null); }
  };

  // Group by role
  const byRole: Record<string, CompanyMember[]> = {};
  members.forEach((m) => {
    const r = m.role ?? 'member';
    if (!byRole[r]) byRole[r] = [];
    byRole[r].push(m);
  });
  const orderedRoles = Object.keys(byRole).sort(
    (a, b) => (ROLE_META[a]?.order ?? 99) - (ROLE_META[b]?.order ?? 99),
  );

  return (
    <AppShell>
      <header className="sticky top-0 z-20 bg-dark-bg-900/85 backdrop-blur-xl border-b border-primary/10 px-4 py-3 flex items-center gap-4">
        <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <ArrowRight size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-black text-[17px]">الفريق</h1>
          <p className="text-white/40 text-xs">
            {members.length} عضو
            {joinRequests.length > 0 && (
              <span className="mr-2 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {joinRequests.length} طلب انضمام
              </span>
            )}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(20,224,164,0.15)', border: '1px solid rgba(20,224,164,0.35)', color: '#14E0A4' }}>
            <UserPlus size={14} /> دعوة عضو
          </button>
        )}
      </header>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4" dir="rtl">
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(20,224,164,0.3)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-black text-lg">دعوة عضو جديد</h2>
              <button onClick={() => { setShowInvite(false); setInviteMsg(''); setInviteEmail(''); }}>
                <X size={20} className="text-white/40" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Mail size={14} className="absolute right-3 top-3.5 text-white/30" />
                <input autoFocus value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="البريد الإلكتروني *"
                  type="email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-9 pl-4 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-500/50 text-sm" />
              </div>
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">الدور</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { k: 'employee', l: 'موظف' },
                    { k: 'manager', l: 'مدير' },
                    { k: 'admin', l: 'مشرف' },
                  ].map(r => (
                    <button key={r.k} onClick={() => setInviteRole(r.k)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: inviteRole === r.k ? 'rgba(20,224,164,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${inviteRole === r.k ? '#14E0A4' : 'rgba(255,255,255,0.08)'}`,
                        color: inviteRole === r.k ? '#14E0A4' : 'rgba(255,255,255,0.4)',
                      }}>{r.l}</button>
                  ))}
                </div>
              </div>
              {inviteMsg && (
                <p className={`text-sm font-bold ${inviteMsg.includes('نجاح') ? 'text-accent-500' : 'text-red-400'}`}>
                  {inviteMsg}
                </p>
              )}
            </div>
            <button onClick={sendInvite} disabled={inviting || !inviteEmail.trim()}
              className="w-full py-3 rounded-xl text-black font-black disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)' }}>
              {inviting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              إرسال الدعوة
            </button>
          </div>
        </div>
      )}

      <div className="px-5 py-5 pb-24 md:pb-10">

        {/* Join Requests — admin only */}
        {isAdmin && joinRequests.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-1 h-5 rounded-sm" style={{ background: '#FFB24D' }} />
              <span className="text-white font-bold text-sm" style={{ color: '#FFB24D' }}>
                طلبات الانضمام
              </span>
              <div className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,178,77,0.15)' }}>
                <span className="text-[11px] font-bold" style={{ color: '#FFB24D' }}>{joinRequests.length}</span>
              </div>
            </div>
            <div className="space-y-2">
              {joinRequests.map(jr => {
                const initials = jr.user_name.slice(0, 2).toUpperCase();
                const isProcessing = actionLoading === jr.id;
                return (
                  <div key={jr.id} className="glass rounded-2xl border border-yellow-500/20 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(255,178,77,0.15)' }}>
                        <span className="font-black text-sm" style={{ color: '#FFB24D' }}>{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{jr.user_name}</p>
                        <p className="text-white/40 text-xs truncate">{jr.user_email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-yellow-400 text-xs">
                        <Clock size={12} />
                        <span>{new Date(jr.created_at).toLocaleDateString('ar-SA')}</span>
                      </div>
                    </div>
                    {jr.message && (
                      <p className="text-white/50 text-xs mb-3 bg-white/[0.03] rounded-lg px-3 py-2 border border-white/5">
                        "{jr.message}"
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleJoinAction(jr.id, 'accept')}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                        style={{ background: 'rgba(20,224,164,0.15)', border: '1px solid rgba(20,224,164,0.3)', color: '#14E0A4' }}>
                        {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        قبول
                      </button>
                      <button
                        onClick={() => handleJoinAction(jr.id, 'reject')}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                        {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                        رفض
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-white/60 text-sm">{error}</p>
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
              <Users size={28} className="text-white/30" />
            </div>
            <p className="text-white/60 text-sm">لا يوجد أعضاء</p>
          </div>
        ) : (
          orderedRoles.map((role) => {
            const meta = ROLE_META[role] ?? { label: role, color: '#6B7280', order: 99 };
            const group = byRole[role];
            return (
              <div key={role} className="mb-7">
                {/* Role header */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-1 h-5 rounded-sm" style={{ background: meta.color }} />
                  <span className="text-white font-bold text-sm" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                  <div
                    className="px-2 py-0.5 rounded-full"
                    style={{ background: `${meta.color}22` }}
                  >
                    <span className="text-[11px] font-bold" style={{ color: meta.color }}>
                      {group.length}
                    </span>
                  </div>
                </div>

                {/* Members with connector line */}
                <div className="relative pr-4">
                  <div
                    className="absolute top-0 right-[22px] bottom-0 w-[2px]"
                    style={{ background: `${meta.color}33` }}
                  />
                  {group.map((m, idx) => {
                    const initials = (m.user_name || 'U').slice(0, 2).toUpperCase();
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 mb-2.5"
                        style={{ marginBottom: idx < group.length - 1 ? 10 : 0 }}
                      >
                        {/* Card */}
                        <div className="flex-1 flex items-center gap-3 bg-white/[0.02] rounded-2xl border border-white/5 px-3.5 py-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${meta.color}22` }}
                          >
                            <span
                              className="font-black text-sm"
                              style={{ color: meta.color }}
                            >
                              {initials}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-bold text-[13px] truncate">
                              {m.user_name || 'مستخدم'}
                            </div>
                            {m.job_title && (
                              <div className="text-white/50 text-[11px] truncate">
                                {m.job_title}
                              </div>
                            )}
                          </div>
                          {m.id !== user?.id && (
                            <button
                              onClick={() => openDm(m.id)}
                              disabled={dmLoading === m.id}
                              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500/20 transition-colors"
                              title="رسالة مباشرة"
                            >
                              {dmLoading === m.id
                                ? <Loader2 size={13} className="animate-spin text-primary-400" />
                                : <MessageCircle size={13} className="text-primary-400" />
                              }
                            </button>
                          )}
                        </div>

                        {/* Connector dot */}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 border-2 border-dark-bg-900"
                          style={{ background: meta.color }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
