'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Phone, Video, PhoneOff, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Users, Clock, Loader2, Plus, MessageCircle,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import {
  apiFetch, getCompanyMembers, getCallHistory,
  ApiError,
  type CompanyMember, type CallHistoryItem,
} from '@/lib/api-client';
import { isAuthenticated, getCachedUser } from '@/lib/auth';

const MeetingRoomOverlay = dynamic(
  () => import('../meetings/MeetingRoomOverlay'),
  { ssr: false }
);

interface ActiveRoom { ws_url: string; token: string; title: string; call_id?: number; }

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDuration(s?: number | null) {
  if (!s || s < 1) return '—';
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}د ${sec}ث` : `${sec}ث`;
}
function statusIcon(c: CallHistoryItem) {
  if (c.status === 'missed' || c.status === 'rejected') return { Icon: PhoneMissed, color: '#EF4444' };
  if (c.is_outgoing) return { Icon: PhoneOutgoing, color: '#3B82F6' };
  return { Icon: PhoneIncoming, color: '#22C55E' };
}
const STATUS_AR: Record<string, string> = {
  accepted: 'مكتملة', ended: 'منتهية', missed: 'فائتة',
  rejected: 'مرفوضة', ringing: 'لم تُجَب',
};

const ROLE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  owner:    { bg: 'rgba(255,178,77,0.15)',  text: '#FFB24D', label: 'مالك' },
  admin:    { bg: 'rgba(255,71,87,0.15)',   text: '#FF4757', label: 'مشرف' },
  manager:  { bg: 'rgba(139,92,246,0.15)', text: '#8B5CF6', label: 'مدير' },
  employee: { bg: 'rgba(46,139,255,0.15)', text: '#2E8BFF', label: 'موظف' },
  member:   { bg: 'rgba(46,139,255,0.15)', text: '#2E8BFF', label: 'عضو' },
};

function getHue(name: string) {
  return name ? (name.charCodeAt(0) * 47) % 360 : 200;
}

// ─── Member Card ──────────────────────────────────────────────────────────────

function MemberCard({
  member,
  onCall,
  onMessage,
  calling,
}: {
  member: CompanyMember;
  onCall: (member: CompanyMember, type: 'audio' | 'video') => void;
  onMessage: (member: CompanyMember) => void;
  calling: number | null;
}) {
  const name     = member.user_name || member.user_email || `عضو #${member.user_id}`;
  const initials = name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const hue      = getHue(name);
  const role     = ROLE_COLORS[member.role] ?? ROLE_COLORS.member;
  const isLoading = calling === member.user_id;

  return (
    <div
      className="flex flex-col items-center gap-3 p-4 rounded-2xl transition-all hover:scale-[1.02]"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Avatar */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg font-black"
        style={{
          background: `hsl(${hue},45%,18%)`,
          border: `2px solid hsl(${hue},50%,32%)`,
          color: `hsl(${hue},70%,72%)`,
        }}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex flex-col items-center gap-1 w-full text-center">
        <p className="text-sm font-bold text-white leading-tight truncate w-full">{name}</p>
        {member.job_title ? (
          <p className="text-xs text-white/40 truncate w-full">{member.job_title}</p>
        ) : (
          <span
            className="inline-block text-xs font-bold px-2 py-0.5 rounded-md"
            style={{ background: role.bg, color: role.text }}
          >
            {role.label}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 w-full">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-2">
            <Loader2 size={16} className="text-white/40 animate-spin" />
          </div>
        ) : (
          <>
            <button
              onClick={() => onCall(member, 'audio')}
              title="اتصال صوتي"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E' }}
            >
              <Phone size={13} />
              اتصال
            </button>
            <button
              onClick={() => onMessage(member)}
              title="رسالة"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#8B5CF6' }}
            >
              <MessageCircle size={13} />
              رسالة
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CallsPage() {
  const router = useRouter();
  const [members, setMembers]   = useState<CompanyMember[]>([]);
  const [calls,   setCalls]     = useState<CallHistoryItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [calling, setCalling]   = useState<number | null>(null);
  const [joining, setJoining]   = useState(false);
  const [creating, setCreating] = useState(false);
  const [meetTitle, setMeetTitle] = useState('');
  const [activeRoom, setActiveRoom] = useState<ActiveRoom | null>(null);
  const [myUserId, setMyUserId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    (async () => {
      try {
        const [membersData, callsData] = await Promise.all([
          getCompanyMembers(),
          getCallHistory(),
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
    setCalling(member.user_id);
    try {
      const data = await apiFetch<{
        call_id: number; room_name: string; token: string; ws_url: string;
      }>('/call/initiate', {
        method: 'POST',
        body: JSON.stringify({ receiver_id: member.user_id, call_type: type }),
      });
      const name = member.user_name || member.user_email || 'مكالمة';
      setActiveRoom({ ws_url: data.ws_url, token: data.token, title: `مكالمة مع ${name}`, call_id: data.call_id });
    } catch (e: any) {
      const msg = e?.message || '';
      alert(msg.includes('مشغول') ? 'المستخدم مشغول حالياً في مكالمة أخرى' : 'تعذّر بدء المكالمة — تحقق من الاتصال');
    } finally {
      setCalling(null);
    }
  }, []);

  const handleMessage = useCallback((member: CompanyMember) => {
    router.push(`/workspace/chat?user=${member.user_id}`);
  }, [router]);

  const startGroupMeeting = async () => {
    setJoining(true);
    try {
      const data = await apiFetch<{ room_name: string; token: string; ws_url: string }>(
        '/livekit/company-room', { method: 'GET' }
      );
      setActiveRoom({ ws_url: data.ws_url, token: data.token, title: 'اجتماع الفريق' });
    } catch {
      alert('تعذّر بدء الاجتماع');
    } finally {
      setJoining(false);
    }
  };

  const createNamedMeeting = async () => {
    if (!meetTitle.trim()) return;
    setCreating(true);
    try {
      const data = await apiFetch<{ room_name: string; token: string; ws_url: string; title: string }>(
        '/livekit/rooms', { method: 'POST', body: JSON.stringify({ title: meetTitle.trim() }) }
      );
      setMeetTitle('');
      setActiveRoom({ ws_url: data.ws_url, token: data.token, title: data.title || meetTitle });
    } catch {
      alert('تعذّر إنشاء الاجتماع');
    } finally {
      setCreating(false);
    }
  };

  const teamMembers = members.filter(m => m.user_id !== myUserId);

  if (activeRoom) {
    return <MeetingRoomOverlay room={activeRoom} onLeave={() => setActiveRoom(null)} />;
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full" dir="rtl">

        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h1 className="text-white font-black text-lg">الاجتماعات</h1>
          <button
            onClick={startGroupMeeting}
            disabled={joining}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: '#fff' }}
          >
            {joining ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
            اجتماع الفريق
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-24 md:pb-6">

          {/* ── New Meeting ── */}
          <section className="px-5 pt-5 pb-2">
            <p className="text-xs font-bold text-white/35 uppercase tracking-wider mb-2.5">اجتماع جديد</p>
            <div className="flex gap-2">
              <input
                value={meetTitle}
                onChange={e => setMeetTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createNamedMeeting()}
                placeholder="عنوان الاجتماع..."
                className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
              />
              <button
                onClick={createNamedMeeting}
                disabled={!meetTitle.trim() || creating}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)', color: '#fff' }}
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                ابدأ
              </button>
            </div>
          </section>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={22} className="text-blue-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Team Member Cards ── */}
              {teamMembers.length > 0 && (
                <section className="px-5 pt-5 pb-2">
                  <p className="text-xs font-bold text-white/35 uppercase tracking-wider mb-3">
                    أعضاء الفريق · {teamMembers.length}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {teamMembers.map(m => (
                      <MemberCard
                        key={m.user_id}
                        member={m}
                        onCall={handleCall}
                        onMessage={handleMessage}
                        calling={calling}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* ── Call History ── */}
              <section className="px-5 pt-5">
                <p className="text-xs font-bold text-white/35 uppercase tracking-wider mb-3">سجل المكالمات</p>
                {calls.length === 0 ? (
                  <div
                    className="rounded-2xl p-10 text-center"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <Phone size={32} className="mx-auto mb-3 text-white/15" />
                    <p className="text-white/35 text-sm">لا توجد مكالمات بعد</p>
                  </div>
                ) : (
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    {calls.map((c, i) => {
                      const { Icon, color } = statusIcon(c);
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.025] transition-colors"
                          style={{ borderBottom: i < calls.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${color}18`, border: `1px solid ${color}40` }}
                          >
                            <Icon size={15} style={{ color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {c.other_user_name}
                              <span className="text-white/30 font-normal text-xs mr-1.5">
                                · {c.call_type === 'video' ? 'فيديو' : 'صوت'}
                              </span>
                            </p>
                            <p className="text-xs text-white/35 flex items-center gap-1 mt-0.5">
                              <Clock size={10} />
                              {c.started_at ? new Date(c.started_at).toLocaleString('ar') : '—'}
                              <span className="mx-1">·</span>
                              {STATUS_AR[c.status ?? ''] ?? c.status}
                              {c.duration ? ` · ${formatDuration(c.duration)}` : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              const member = members.find(m => m.user_id === c.other_user_id);
                              if (member) handleCall(member, c.call_type);
                            }}
                            title="اتصل مجدداً"
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                            style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}
                          >
                            <Phone size={12} style={{ color: '#3B82F6' }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
