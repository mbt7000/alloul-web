'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Users, Clock, Loader2, Plus, MessageCircle, Video,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import {
  apiFetch, getCompanyMembers, getCallHistory,
  ApiError,
  type CompanyMember, type CallHistoryItem,
} from '@/lib/api-client';
import { isAuthenticated, getCachedUser } from '@/lib/auth';
import { useCallContext } from '@/context/CallContext';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDuration(s?: number | null) {
  if (!s || s < 1) return null;
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}د ${sec}ث` : `${sec}ث`;
}

function timeAgo(dateStr?: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  return d.toLocaleDateString('ar', { month: 'short', day: 'numeric' });
}

function statusIcon(c: CallHistoryItem) {
  if (c.status === 'missed')   return { Icon: PhoneMissed,  color: '#EF4444', label: 'فائتة' };
  if (c.status === 'rejected') return { Icon: PhoneMissed,  color: '#EF4444', label: 'مرفوضة' };
  if (c.is_outgoing)           return { Icon: PhoneOutgoing, color: '#60A5FA', label: 'صادرة' };
  return                              { Icon: PhoneIncoming, color: '#34D399', label: 'واردة' };
}

const ROLE_META: Record<string, { color: string; label: string }> = {
  owner:    { color: '#F59E0B', label: 'مالك' },
  admin:    { color: '#EF4444', label: 'مشرف' },
  manager:  { color: '#8B5CF6', label: 'مدير' },
  employee: { color: '#3B82F6', label: 'موظف' },
  member:   { color: '#3B82F6', label: 'عضو' },
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '؟';
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({
  member, onCall, onMessage, calling,
}: {
  member: CompanyMember;
  onCall: (m: CompanyMember, t: 'audio' | 'video') => void;
  onMessage: (m: CompanyMember) => void;
  calling: number | null;
}) {
  const name    = member.user_name || member.user_email || `#${member.user_id}`;
  const role    = ROLE_META[member.role] ?? ROLE_META.member;
  const busy    = calling === member.user_id;

  return (
    <div className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.035]"
         style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black select-none"
          style={{ background: 'rgba(59,130,246,0.14)', color: '#60A5FA', border: '1.5px solid rgba(59,130,246,0.28)' }}
        >
          {getInitials(name)}
        </div>
        {/* online dot placeholder */}
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0f1623] bg-[#475569]" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-white leading-snug truncate">{name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {member.job_title && (
            <span className="text-xs text-white/40 truncate">{member.job_title}</span>
          )}
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: `${role.color}18`, color: role.color }}
          >
            {role.label}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {busy ? (
          <Loader2 size={16} className="text-white/30 animate-spin mx-3" />
        ) : (
          <>
            <button
              onClick={() => onCall(member, 'audio')}
              title="اتصال صوتي"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#34D399' }}
            >
              <Phone size={12} />
              اتصال
            </button>
            <button
              onClick={() => onMessage(member)}
              title="رسالة"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: '#A78BFA' }}
            >
              <MessageCircle size={12} />
              رسالة
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Call History Row ─────────────────────────────────────────────────────────

function HistoryRow({ c, onCallback }: { c: CallHistoryItem; onCallback: () => void }) {
  const { Icon, color, label } = statusIcon(c);
  const dur = formatDuration(c.duration);

  return (
    <div className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.025]"
         style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>

      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
           style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
        <Icon size={14} style={{ color }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-white/90 truncate">
          {c.other_user_name || '—'}
          <span className="text-white/30 font-normal text-[11px] mr-1.5">
            {c.call_type === 'video' ? '· فيديو' : '· صوت'}
          </span>
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px]" style={{ color }}>{label}</span>
          {dur && <span className="text-[11px] text-white/30">{dur}</span>}
          <span className="text-[11px] text-white/25 flex items-center gap-1">
            <Clock size={9} />{timeAgo(c.started_at)}
          </span>
        </div>
      </div>

      <button
        onClick={onCallback}
        title="اتصل مجدداً"
        className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
        style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}
      >
        <Phone size={12} style={{ color: '#60A5FA' }} />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CallsPage() {
  const router = useRouter();
  const { mode, initiateCall, startRoom } = useCallContext();
  const [members,   setMembers]  = useState<CompanyMember[]>([]);
  const [calls,     setCalls]    = useState<CallHistoryItem[]>([]);
  const [loading,   setLoading]  = useState(true);
  const [calling,   setCalling]  = useState<number | null>(null);
  const [joining,   setJoining]  = useState(false);
  const [creating,  setCreating] = useState(false);
  const [meetTitle, setMeetTitle] = useState('');
  const [myUserId,  setMyUserId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    (async () => {
      try {
        const [membersData, callsData] = await Promise.all([
          getCompanyMembers(), getCallHistory(),
        ]);
        const me = getCachedUser();
        setMyUserId(me?.id ?? null);
        setMembers(Array.isArray(membersData) ? membersData : []);
        setCalls(Array.isArray(callsData) ? callsData : []);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) router.replace('/login');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleCall = useCallback(async (member: CompanyMember, type: 'audio' | 'video') => {
    if (mode !== 'idle') return;
    const name = member.user_name || member.user_email || `#${member.user_id}`;
    setCalling(member.user_id);
    await initiateCall(member.user_id, name, type);
    setCalling(null);
  }, [mode, initiateCall]);

  const handleMessage = useCallback((member: CompanyMember) => {
    router.push(`/workspace/chat?user=${member.user_id}`);
  }, [router]);

  const startGroupMeeting = async () => {
    if (mode !== 'idle') return;
    setJoining(true);
    try {
      const data = await apiFetch<{ room_name: string; token: string; ws_url: string }>(
        '/livekit/company-room', { method: 'GET' }
      );
      startRoom({ ws_url: data.ws_url, token: data.token, title: 'اجتماع الفريق' });
    } catch { alert('تعذّر بدء الاجتماع'); }
    finally { setJoining(false); }
  };

  const createNamedMeeting = async () => {
    if (!meetTitle.trim() || mode !== 'idle') return;
    setCreating(true);
    try {
      const data = await apiFetch<{ room_name: string; token: string; ws_url: string; title: string }>(
        '/livekit/rooms', { method: 'POST', body: JSON.stringify({ title: meetTitle.trim() }) }
      );
      setMeetTitle('');
      startRoom({ ws_url: data.ws_url, token: data.token, title: data.title || meetTitle });
    } catch { alert('تعذّر إنشاء الاجتماع'); }
    finally { setCreating(false); }
  };

  const teamMembers = members.filter(m => m.user_id !== myUserId);

  return (
    <AppShell>
      <div className="flex flex-col h-full" dir="rtl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
             style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <h1 className="text-white font-black text-base leading-tight">الاجتماعات</h1>
            <p className="text-white/35 text-xs mt-0.5">
              {teamMembers.length} عضو
            </p>
          </div>
          <button
            onClick={startGroupMeeting}
            disabled={joining}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: '#fff' }}
          >
            {joining ? <Loader2 size={13} className="animate-spin" /> : <Users size={13} />}
            اجتماع الفريق
          </button>
        </div>

        {/* ── Two-column layout on wide screens ── */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-0">

          {/* ── Left: Members + New Meeting ── */}
          <div className="lg:flex-1 overflow-y-auto" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>

            {/* New Meeting */}
            <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[11px] font-bold text-white/35 uppercase tracking-widest mb-3">اجتماع جديد</p>
              <div className="flex gap-2">
                <input
                  value={meetTitle}
                  onChange={e => setMeetTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createNamedMeeting()}
                  placeholder="عنوان الاجتماع..."
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <button
                  onClick={createNamedMeeting}
                  disabled={!meetTitle.trim() || creating}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-all hover:opacity-90"
                  style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.35)', color: '#A78BFA' }}
                >
                  {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  ابدأ
                </button>
              </div>
            </div>

            {/* Members */}
            <div className="pt-1 pb-6">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={20} className="text-blue-500/60 animate-spin" />
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <Users size={36} className="text-white/10 mb-3" />
                  <p className="text-white/30 text-sm">لا يوجد أعضاء آخرون</p>
                </div>
              ) : (
                teamMembers.map(m => (
                  <MemberRow
                    key={m.user_id}
                    member={m}
                    onCall={handleCall}
                    onMessage={handleMessage}
                    calling={calling}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Right: Call History ── */}
          <div className="lg:w-[340px] overflow-y-auto pb-6 flex-shrink-0">
            <div className="px-5 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[11px] font-bold text-white/35 uppercase tracking-widest">سجل المكالمات</p>
            </div>

            {loading ? null : calls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <Phone size={32} className="text-white/10 mb-3" />
                <p className="text-white/30 text-sm">لا توجد مكالمات بعد</p>
              </div>
            ) : (
              calls.map(c => (
                <HistoryRow
                  key={c.id}
                  c={c}
                  onCallback={() => {
                    const member = members.find(m => m.user_id === c.other_user_id);
                    if (member) handleCall(member, c.call_type);
                  }}
                />
              ))
            )}
          </div>

        </div>
      </div>
    </AppShell>
  );
}
