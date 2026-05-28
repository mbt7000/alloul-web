'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Users, Clock, Loader2, Plus, MessageCircle,
  Wifi, Coffee, Moon, Circle,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import {
  apiFetch, getCompanyMembers, getCallHistory, updateMyPresence,
  ApiError,
  type CompanyMember, type CallHistoryItem, type PresenceStatus,
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
  if (diff < 60)    return 'الآن';
  if (diff < 3600)  return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  return d.toLocaleDateString('ar', { month: 'short', day: 'numeric' });
}

function historyIcon(c: CallHistoryItem) {
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

const PRESENCE_META: Record<PresenceStatus, { color: string; label: string; Icon: any }> = {
  online:  { color: '#22C55E', label: 'متصل',        Icon: Wifi    },
  busy:    { color: '#EF4444', label: 'مشغول',       Icon: Circle  },
  away:    { color: '#F59E0B', label: 'خارج المكتب', Icon: Coffee  },
  offline: { color: '#475569', label: 'غير متصل',    Icon: Moon    },
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '؟';
}

// ─── My Status Card ───────────────────────────────────────────────────────────

function MyStatusCard({ me, myPresence, onChangePresence, saving }: {
  me: any;
  myPresence: PresenceStatus;
  onChangePresence: (s: PresenceStatus) => void;
  saving: boolean;
}) {
  const name     = me?.name || me?.username || me?.email || 'أنا';
  const initials = getInitials(name);
  const pm       = PRESENCE_META[myPresence];

  return (
    <div className="mx-5 mt-4 mb-1 rounded-2xl p-4"
         style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>

      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black"
               style={{ background: 'rgba(59,130,246,0.16)', color: '#60A5FA', border: '1.5px solid rgba(59,130,246,0.32)' }}>
            {initials}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0f1623]"
                style={{ background: pm.color }} />
        </div>

        {/* Name + current status */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-white truncate">{name}</p>
          <p className="text-[11px] font-semibold mt-0.5 flex items-center gap-1.5"
             style={{ color: pm.color }}>
            <pm.Icon size={10} />
            {pm.label}
          </p>
        </div>

        {saving && <Loader2 size={14} className="text-white/30 animate-spin flex-shrink-0" />}
      </div>

      {/* Status switcher */}
      <div className="grid grid-cols-4 gap-1.5">
        {(Object.keys(PRESENCE_META) as PresenceStatus[]).map(s => {
          const p = PRESENCE_META[s];
          const active = myPresence === s;
          return (
            <button
              key={s}
              onClick={() => onChangePresence(s)}
              disabled={saving}
              className="flex flex-col items-center gap-1 py-2 rounded-xl transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{
                background: active ? `${p.color}20` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? p.color + '50' : 'rgba(255,255,255,0.07)'}`,
              }}
            >
              <p.Icon size={13} style={{ color: p.color }} />
              <span className="text-[10px] font-semibold leading-none" style={{ color: active ? p.color : 'rgba(255,255,255,0.4)' }}>
                {p.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({ member, onCall, onMessage, calling }: {
  member: CompanyMember;
  onCall: (m: CompanyMember, t: 'audio' | 'video') => void;
  onMessage: (m: CompanyMember) => void;
  calling: number | null;
}) {
  const name     = member.user_name || member.user_email || `#${member.user_id}`;
  const role     = ROLE_META[member.role] ?? ROLE_META.member;
  const presence = PRESENCE_META[(member.presence_status as PresenceStatus) ?? 'offline'];
  const busy     = calling === member.user_id;

  return (
    <div className="group flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-white/[0.03]"
         style={{ borderBottom: '1px solid rgba(255,255,255,0.045)' }}>

      {/* Avatar + presence dot */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-black"
             style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1.5px solid rgba(59,130,246,0.25)' }}>
          {getInitials(name)}
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0f1623]"
              style={{ background: presence.color }} />
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-white leading-snug truncate">{name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: presence.color }}>
            <presence.Icon size={9} />
            {presence.label}
          </span>
          {member.job_title ? (
            <span className="text-[10px] text-white/30 truncate">· {member.job_title}</span>
          ) : (
            <span className="text-[10px] font-bold px-1.5 py-px rounded-md"
                  style={{ background: `${role.color}15`, color: role.color }}>
              {role.label}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {busy ? (
          <Loader2 size={15} className="text-white/25 animate-spin mx-2" />
        ) : (
          <>
            <button
              onClick={() => onCall(member, 'audio')}
              title="اتصال صوتي"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              <Phone size={13} style={{ color: '#34D399' }} />
            </button>
            <button
              onClick={() => onMessage(member)}
              title="رسالة"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}
            >
              <MessageCircle size={13} style={{ color: '#A78BFA' }} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── History Row ──────────────────────────────────────────────────────────────

function HistoryRow({ c, onCallback }: { c: CallHistoryItem; onCallback: () => void }) {
  const { Icon, color, label } = historyIcon(c);
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
          <span className="text-white/25 font-normal text-[11px] mr-1.5">
            {c.call_type === 'video' ? '· فيديو' : '· صوت'}
          </span>
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px]" style={{ color }}>{label}</span>
          {dur && <span className="text-[11px] text-white/25">{dur}</span>}
          <span className="text-[11px] text-white/20 flex items-center gap-1">
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

  const [members,    setMembers]    = useState<CompanyMember[]>([]);
  const [calls,      setCalls]      = useState<CallHistoryItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [calling,    setCalling]    = useState<number | null>(null);
  const [joining,    setJoining]    = useState(false);
  const [creating,   setCreating]   = useState(false);
  const [meetTitle,  setMeetTitle]  = useState('');
  const [myUserId,   setMyUserId]   = useState<number | null>(null);
  const [me,         setMe]         = useState<any>(null);
  const [myPresence, setMyPresence] = useState<PresenceStatus>('online');
  const [savingPresence, setSavingPresence] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    const cachedMe = getCachedUser() as any;
    setMe(cachedMe);
    setMyUserId(cachedMe?.id ?? null);
    if (cachedMe?.presence_status) setMyPresence(cachedMe.presence_status as PresenceStatus);

    (async () => {
      try {
        const [membersData, callsData] = await Promise.all([
          getCompanyMembers(), getCallHistory(),
        ]);
        setMembers(Array.isArray(membersData) ? membersData : []);
        setCalls(Array.isArray(callsData) ? callsData : []);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) router.replace('/login');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handlePresenceChange = useCallback(async (status: PresenceStatus) => {
    setSavingPresence(true);
    setMyPresence(status);
    try {
      await updateMyPresence(status);
    } catch {
      // revert on failure — refetch would be cleaner but optimistic is fine here
    } finally {
      setSavingPresence(false);
    }
  }, []);

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

  // Filter out self — show everyone else
  const teamMembers = members.filter(m => m.user_id !== myUserId);

  // Sort: online first, then busy, then away, then offline
  const ORDER: Record<string, number> = { online: 0, busy: 1, away: 2, offline: 3 };
  const sorted = [...teamMembers].sort((a, b) =>
    (ORDER[a.presence_status ?? 'offline'] ?? 3) - (ORDER[b.presence_status ?? 'offline'] ?? 3)
  );

  return (
    <AppShell>
      <div className="flex flex-col h-full" dir="rtl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
             style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <h1 className="text-white font-black text-base leading-tight">الاتصالات</h1>
            <p className="text-white/30 text-xs mt-0.5">
              {teamMembers.length} عضو في الشركة
            </p>
          </div>
          <button
            onClick={startGroupMeeting}
            disabled={joining || mode !== 'idle'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: '#fff' }}
          >
            {joining ? <Loader2 size={13} className="animate-spin" /> : <Users size={13} />}
            اجتماع الفريق
          </button>
        </div>

        {/* ── Two-column layout ── */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

          {/* ── Left: My status + Members ── */}
          <div className="lg:flex-1 overflow-y-auto flex flex-col"
               style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>

            {/* My status */}
            {me && (
              <MyStatusCard
                me={me}
                myPresence={myPresence}
                onChangePresence={handlePresenceChange}
                saving={savingPresence}
              />
            )}

            {/* New meeting input */}
            <div className="px-5 pt-3 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2">اجتماع جديد</p>
              <div className="flex gap-2">
                <input
                  value={meetTitle}
                  onChange={e => setMeetTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createNamedMeeting()}
                  placeholder="عنوان الاجتماع..."
                  className="flex-1 rounded-xl px-3.5 py-2 text-sm text-white placeholder-white/20 outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                />
                <button
                  onClick={createNamedMeeting}
                  disabled={!meetTitle.trim() || creating || mode !== 'idle'}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold disabled:opacity-40 transition-all hover:opacity-90"
                  style={{ background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.32)', color: '#A78BFA' }}
                >
                  {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  ابدأ
                </button>
              </div>
            </div>

            {/* Members section label */}
            <div className="px-5 pt-4 pb-1 flex items-center justify-between">
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest">
                أعضاء الشركة
              </p>
              {!loading && sorted.length > 0 && (
                <span className="text-[10px] text-white/20">{sorted.length}</span>
              )}
            </div>

            {/* Members list */}
            <div className="flex-1 pb-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={18} className="text-blue-500/50 animate-spin" />
                </div>
              ) : sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <Users size={32} className="text-white/8 mb-3" />
                  <p className="text-white/25 text-sm">لا يوجد أعضاء آخرون في الشركة</p>
                  <p className="text-white/15 text-xs mt-1">يمكنك دعوة أعضاء من إعدادات الشركة</p>
                </div>
              ) : (
                sorted.map(m => (
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
          <div className="lg:w-[320px] flex-shrink-0 flex flex-col overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex-shrink-0"
                 style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest">
                سجل المكالمات
              </p>
            </div>
            <div className="flex-1 overflow-y-auto pb-6">
              {loading ? null : calls.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <Phone size={28} className="text-white/8 mb-3" />
                  <p className="text-white/25 text-sm">لا توجد مكالمات بعد</p>
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
      </div>
    </AppShell>
  );
}
