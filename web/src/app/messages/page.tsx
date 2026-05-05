'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare, Send, Loader2, Users, Video, Phone,
  ChevronLeft, Search, X,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import {
  getCompanyMembers, getCompanyDailyJoinUrl, type CompanyMember,
} from '@/lib/api-client';
import { isAuthenticated, getCachedUser } from '@/lib/auth';

type Message = { from: 'me' | 'them'; text: string; time: string };
type Thread = { member: CompanyMember; messages: Message[] };

export default function MessagesPage() {
  const router = useRouter();
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Thread | null>(null);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [callLoading, setCallLoading] = useState(false);
  const currentUser = getCachedUser();

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    getCompanyMembers()
      .then((m) => setMembers(m.filter((x) => x.user_id !== currentUser?.id)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router, currentUser?.id]);

  const filtered = members.filter(
    (m) =>
      !query ||
      (m.user_name ?? '').toLowerCase().includes(query.toLowerCase()) ||
      (m.job_title ?? '').toLowerCase().includes(query.toLowerCase()),
  );

  const openThread = (m: CompanyMember) => {
    setActive({ member: m, messages: [] });
    setDraft('');
  };

  const sendMsg = () => {
    if (!draft.trim() || !active) return;
    const now = new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    setActive((prev) =>
      prev ? { ...prev, messages: [...prev.messages, { from: 'me', text: draft.trim(), time: now }] } : prev,
    );
    setDraft('');
  };

  const startCall = async () => {
    setCallLoading(true);
    try {
      const { join_url } = await getCompanyDailyJoinUrl();
      window.open(join_url, '_blank');
    } catch {
      alert('تعذّر فتح غرفة المكالمة');
    } finally {
      setCallLoading(false);
    }
  };

  /* ── Chat View ── */
  if (active) {
    const { member, messages } = active;
    const initials = (member.user_name || member.user_email || 'U').slice(0, 2).toUpperCase();
    return (
      <AppShell>
        <header className="sticky top-0 z-20 glass-chrome px-4 py-3 flex items-center gap-3">
          <button onClick={() => setActive(null)} className="p-2 -ml-2 rounded-xl hover:bg-white/5 text-white/60">
            <ChevronLeft size={18} />
          </button>
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2E8BFF55, #00D4FF55)' }}
          >
            {initials}
          </div>
          <div className="flex-1">
            <div className="text-white text-sm font-bold leading-none">{member.user_name || member.user_email}</div>
            <div className="text-white/40 text-[11px] mt-0.5">{member.job_title || member.role}</div>
          </div>
          <button onClick={startCall} disabled={callLoading} className="p-2 rounded-xl hover:bg-white/5 text-primary-400 disabled:opacity-50">
            {callLoading ? <Loader2 size={18} className="animate-spin" /> : <Video size={18} />}
          </button>
        </header>

        <div className="flex flex-col h-[calc(100vh-140px)]">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                <MessageSquare size={36} className="text-white/20" />
                <p className="text-white/30 text-sm">ابدأ المحادثة مع {member.user_name || 'هذا العضو'}</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'me' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.from === 'me'
                      ? 'bg-primary-500 text-white rounded-tr-md'
                      : 'bg-white/8 text-white/90 rounded-tl-md'
                  }`}
                >
                  {msg.text}
                  <div className={`text-[10px] mt-1 ${msg.from === 'me' ? 'text-white/50' : 'text-white/30'}`}>
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 pb-4 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
              placeholder="اكتب رسالة..."
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary/50"
            />
            <button
              onClick={sendMsg}
              disabled={!draft.trim()}
              className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center text-white disabled:opacity-30 hover:bg-primary-400 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ── Contacts List ── */
  return (
    <AppShell>
      <header className="sticky top-0 z-20 glass-chrome px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <MessageSquare size={18} className="text-secondary-400" />
          <h1 className="text-white font-black text-lg flex-1">الرسائل</h1>
          <span className="text-white/30 text-xs">{members.length} عضو</span>
        </div>
        <div className="relative">
          <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pr-10 pl-4 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary/50"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute left-3.5 top-1/2 -translate-y-1/2">
              <X size={13} className="text-white/30" />
            </button>
          )}
        </div>
      </header>

      <div className="px-4 py-4 pb-24 md:pb-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-primary animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users size={40} className="text-white/10" />
            <p className="text-white/30 text-sm font-medium">
              {query ? 'لا يوجد عضو بهذا الاسم' : 'لا يوجد أعضاء في الفريق بعد'}
            </p>
          </div>
        )}

        <div className="space-y-1">
          {filtered.map((m) => {
            const initials = (m.user_name || m.user_email || 'U').slice(0, 2).toUpperCase();
            return (
              <button
                key={m.id}
                onClick={() => openThread(m)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-white/[0.05] transition-colors text-right"
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #2E8BFF44, #14E0A444)' }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-bold truncate">
                    {m.user_name || m.user_email}
                  </div>
                  <div className="text-white/40 text-[11px] mt-0.5 truncate">
                    {m.job_title || (m.role === 'owner' ? 'مالك' : m.role === 'admin' ? 'مسؤول' : 'عضو')}
                  </div>
                </div>
                <ChevronLeft size={14} className="text-white/20 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
