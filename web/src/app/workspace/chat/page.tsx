'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, MessageSquare, Send, Loader2, Search,
  ChevronLeft, Users, X,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import {
  getConversations, getCompanyMembers, startConversation,
  getMessages, sendMessage as apiSendMsg,
  type Conversation, type ChatMessage, type CompanyMember,
} from '@/lib/api-client';
import { isAuthenticated, getCachedUser } from '@/lib/auth';

function initials(name?: string | null) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2);
}
function timeStr(dateStr?: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
}

const GRAD = [
  'linear-gradient(135deg,#2E8BFF,#00D4FF)',
  'linear-gradient(135deg,#8B5CF6,#ec4899)',
  'linear-gradient(135deg,#14E0A4,#2E8BFF)',
  'linear-gradient(135deg,#FFB24D,#f97316)',
  'linear-gradient(135deg,#00D4FF,#14E0A4)',
];

export default function ChatPage() {
  const router = useRouter();
  const me = getCachedUser();

  const [convs, setConvs]     = useState<Conversation[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [active, setActive]   = useState<Conversation | null>(null);
  const [msgs, setMsgs]       = useState<ChatMessage[]>([]);
  const [draft, setDraft]     = useState('');
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [showPeople, setShowPeople]   = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    Promise.all([
      getConversations().catch(() => [] as Conversation[]),
      getCompanyMembers().catch(() => [] as CompanyMember[]),
    ]).then(([c, m]) => {
      setConvs(c);
      setMembers(m.filter(x => x.user_id !== me?.id));
    }).finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  useEffect(() => {
    if (!active) { if (pollRef.current) clearInterval(pollRef.current); return; }
    loadMsgs(active.id);
    pollRef.current = setInterval(() => loadMsgs(active.id), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [active?.id]);

  async function loadMsgs(convId: number) {
    try { setMsgs(await getMessages(convId)); } catch {}
  }

  async function openConv(conv: Conversation) {
    setActive(conv);
    setMsgsLoading(true);
    try { setMsgs(await getMessages(conv.id)); } catch {}
    setMsgsLoading(false);
    setConvs(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
  }

  async function openMember(m: CompanyMember) {
    setShowPeople(false);
    try {
      const conv = await startConversation(m.user_id);
      setConvs(prev => prev.find(c => c.id === conv.id) ? prev : [conv, ...prev]);
      openConv(conv);
    } catch {}
  }

  async function send() {
    if (!draft.trim() || !active || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft('');
    try {
      const msg = await apiSendMsg(active.id, text);
      setMsgs(prev => [...prev, msg]);
      setConvs(prev => prev.map(c =>
        c.id === active.id ? { ...c, last_message: text, last_message_at: msg.created_at } : c
      ));
    } catch {}
    setSending(false);
  }

  const filteredConvs   = convs.filter(c => !query || (c.other_user_name || '').toLowerCase().includes(query.toLowerCase()));
  const filteredMembers = members.filter(m => !query || (m.user_name || m.user_email || '').toLowerCase().includes(query.toLowerCase()));
  const totalUnread     = convs.reduce((s, c) => s + (c.unread_count || 0), 0);

  /* ── Chat View ── */
  if (active) {
    const nm = active.other_user_name || 'مستخدم';
    return (
      <AppShell>
        <header className="sticky top-0 z-20 glass-chrome px-4 py-3 flex items-center gap-3">
          <button onClick={() => setActive(null)} className="p-2 -ml-2 rounded-xl hover:bg-white/5 text-white/60">
            <ChevronLeft size={18} />
          </button>
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
            style={{ background: GRAD[active.other_user_id % GRAD.length] }}>
            {initials(nm)}
          </div>
          <div className="flex-1">
            <div className="text-white text-sm font-bold">{nm}</div>
          </div>
        </header>

        <div className="flex flex-col" style={{ height: 'calc(100vh - 130px)' }}>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {msgsLoading && <div className="flex justify-center py-10"><Loader2 size={20} className="text-primary animate-spin" /></div>}
            {!msgsLoading && msgs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                <MessageSquare size={32} className="text-white/20" />
                <p className="text-white/30 text-sm">ابدأ المحادثة</p>
              </div>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.is_mine ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  m.is_mine ? 'bg-primary-500/80 text-white rounded-tr-md' : 'bg-white/8 text-white/90 rounded-tl-md'
                }`}>
                  {m.content}
                  <div className={`text-[10px] mt-1 ${m.is_mine ? 'text-white/50' : 'text-white/30'}`}>{timeStr(m.created_at)}</div>
                </div>
              </div>
            ))}
            <div ref={msgEndRef} />
          </div>
          <div className="px-4 pb-4 flex gap-2">
            <input value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="اكتب رسالة..." className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary/50" />
            <button onClick={send} disabled={!draft.trim() || sending}
              className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center text-white disabled:opacity-30 hover:bg-primary-400 transition-colors">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ── Conversations List ── */
  return (
    <AppShell>
      <header className="sticky top-0 z-20 glass-chrome px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5 text-white/70"><ArrowRight size={18} /></Link>
          <MessageSquare size={16} className="text-secondary-400" />
          <h1 className="text-white font-black text-[17px] flex-1">الرسائل</h1>
          {totalUnread > 0 && (
            <div className="w-5 h-5 rounded-full bg-danger flex items-center justify-center">
              <span className="text-white text-[10px] font-black">{totalUnread}</span>
            </div>
          )}
          <button onClick={() => setShowPeople(v => !v)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors">
            {showPeople ? <X size={16} /> : <Users size={16} />}
          </button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="بحث..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pr-10 pl-4 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary/50" />
        </div>
      </header>

      <div className="px-4 py-4 pb-24">
        {loading && <div className="flex justify-center py-20"><Loader2 size={24} className="text-primary animate-spin" /></div>}

        {showPeople && filteredMembers.length > 0 && (
          <div className="mb-4">
            <p className="text-white/40 text-xs font-bold mb-2 px-1">اضغط على عضو لبدء محادثة</p>
            <div className="space-y-1">
              {filteredMembers.map((m, i) => (
                <button key={m.id} onClick={() => openMember(m)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-right">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{ background: GRAD[i % GRAD.length] }}>
                    {initials(m.user_name || m.user_email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-bold truncate">{m.user_name || m.user_email}</div>
                    <div className="text-white/40 text-[11px]">{m.job_title || m.role}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="my-3 h-px bg-white/8" />
          </div>
        )}

        {!loading && filteredConvs.length === 0 && !showPeople && (
          <div className="text-center py-20 text-white/40">
            <MessageSquare size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">لا توجد محادثات بعد</p>
            <button onClick={() => setShowPeople(true)} className="mt-3 text-primary-400 text-sm font-bold hover:text-primary-300">ابدأ محادثة جديدة ←</button>
          </div>
        )}

        <div className="space-y-1">
          {filteredConvs.map((c, i) => (
            <button key={c.id} onClick={() => openConv(c)}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-white/[0.05] transition-colors text-right">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                style={{ background: GRAD[c.other_user_id % GRAD.length] }}>
                {initials(c.other_user_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="text-white text-sm font-bold truncate">{c.other_user_name || 'مستخدم'}</div>
                  {c.last_message_at && <span className="text-white/30 text-[10px] flex-shrink-0">{timeStr(c.last_message_at)}</span>}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <div className="text-white/40 text-[11px] truncate">{c.last_message || 'لا توجد رسائل'}</div>
                  {c.unread_count > 0 && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ml-2">
                      <span className="text-white text-[9px] font-black">{c.unread_count}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
