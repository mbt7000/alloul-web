'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, Hash, Send, Plus, MessageSquare,
  Users, Search, Video, Loader2, Phone,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { isAuthenticated } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';

interface Channel { id: string; name: string; unread: number; last_message: string; members: number; type: string; }
interface Message  { id: string; text: string; sender_name: string; created_at: string; is_mine: boolean; }

function formatTime(ts: string) {
  try { return new Date(ts).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function getHue(name: string) { return name ? name.charCodeAt(0) * 47 % 360 : 200; }

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name?.slice(0, 2).toUpperCase() || '??';
  const hue = getHue(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3,
      background: `hsl(${hue},55%,28%)`,
      border: `1px solid hsl(${hue},55%,40%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ color: `hsl(${hue},80%,75%)`, fontSize: size * 0.35, fontWeight: 800 }}>{initials}</span>
    </div>
  );
}

function CallCard({ url, callerName, title }: { url: string; callerName: string; title: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-secondary-500/25"
      style={{ background: 'rgba(20,224,164,0.06)' }}>
      <div className="px-3 pt-3 pb-2 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(20,224,164,0.15)', border: '1px solid rgba(20,224,164,0.3)' }}>
          <Video size={15} className="text-secondary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-[13px] truncate">{title || 'مكالمة فيديو'}</p>
          <p className="text-white/40 text-[11px]">بدأ مكالمة جماعية</p>
        </div>
      </div>
      <div className="px-3 pb-3">
        <a href={url}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-[13px] font-black text-dark-bg-900"
          style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)' }}>
          <Phone size={13} /> انضم للمكالمة
        </a>
      </div>
    </div>
  );
}

function MessageBubble({ msg, showAvatar }: { msg: Message; showAvatar: boolean }) {
  const callMatch = msg.text.match(/https:\/\/alloul\.app\/(?:meet|workspace\/smart-meetings)\S*/);
  const titleMatch = msg.text.match(/مكالمة[:\s]+(.+?)(?:\s*[|\n]|$)/);
  const callerMatch = msg.text.match(/^(.+?)\s+بدأ/);

  if (callMatch) {
    return (
      <div className={`flex gap-2.5 items-end mb-1 ${msg.is_mine ? 'flex-row-reverse' : ''}`}>
        {!msg.is_mine && (showAvatar ? <Avatar name={msg.sender_name} size={30} /> : <div style={{ width: 30 }} />)}
        <div style={{ maxWidth: 280 }}>
          {showAvatar && !msg.is_mine && (
            <p className="text-[11px] text-white/40 mb-1 px-1">{msg.sender_name}</p>
          )}
          <CallCard
            url={callMatch[0]}
            callerName={callerMatch?.[1] || msg.sender_name}
            title={titleMatch?.[1]?.trim() || 'مكالمة الشركة'}
          />
          <p className="text-[10px] text-white/30 mt-1 px-1 text-left">{formatTime(msg.created_at)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2.5 items-end mb-1 ${msg.is_mine ? 'flex-row-reverse' : ''}`}>
      {!msg.is_mine && (showAvatar ? <Avatar name={msg.sender_name} size={30} /> : <div style={{ width: 30 }} />)}
      <div style={{ maxWidth: '65%' }}>
        {showAvatar && !msg.is_mine && (
          <p className="text-[11px] text-white/40 mb-1 px-1">{msg.sender_name}</p>
        )}
        <div style={{
          padding: '8px 12px',
          borderRadius: msg.is_mine ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background: msg.is_mine
            ? 'linear-gradient(135deg,#1d4ed8,#2563eb)'
            : 'rgba(255,255,255,0.06)',
          border: msg.is_mine ? 'none' : '1px solid rgba(255,255,255,0.07)',
        }}>
          <p className="text-[14px] text-white leading-relaxed" dir="rtl">{msg.text}</p>
        </div>
        <p className={`text-[10px] text-white/30 mt-1 px-1 ${msg.is_mine ? 'text-left' : 'text-right'}`}>
          {formatTime(msg.created_at)}
        </p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const [channels, setChannels]       = useState<Channel[]>([]);
  const [active, setActive]           = useState<Channel | null>(null);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [text, setText]               = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending]         = useState(false);
  const [search, setSearch]           = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    apiFetch<{ channels: Channel[] }>('/chat/channels')
      .then(d => { setChannels(d.channels); if (d.channels.length) setActive(d.channels[0]); })
      .catch(() => {});
  }, [router]);

  const loadMessages = useCallback(async (ch: Channel) => {
    setLoadingMsgs(true);
    try {
      const d = await apiFetch<{ messages: Message[] }>(`/chat/channels/${ch.id}/messages`);
      setMessages(d.messages);
    } catch {} finally { setLoadingMsgs(false); }
  }, []);

  useEffect(() => {
    if (!active) return;
    loadMessages(active);
    pollRef.current = setInterval(() => loadMessages(active), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [active, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !active || sending) return;
    setSending(true);
    const optimistic: Message = {
      id: Date.now().toString(), text: text.trim(),
      sender_name: 'أنت', created_at: new Date().toISOString(), is_mine: true,
    };
    setMessages(p => [...p, optimistic]);
    const sent = text.trim();
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    try {
      await apiFetch(`/chat/channels/${active.id}/messages`, {
        method: 'POST', body: JSON.stringify({ text: sent }),
      });
    } catch {} finally { setSending(false); }
  };

  const filtered = channels.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const Sidebar = (
    <div className="flex flex-col h-full"
      style={{ background: 'rgba(8,12,24,0.95)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Sidebar header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Search size={13} className="text-white/30 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث..." dir="rtl"
            className="bg-transparent border-none outline-none text-white/70 text-sm w-full placeholder:text-white/25" />
        </div>
      </div>

      {/* Section label */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest text-white/25 uppercase">القنوات</span>
        <button className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-white/5 transition-colors">
          <Plus size={12} className="text-white/30" />
        </button>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {filtered.map(ch => {
          const isActive = active?.id === ch.id;
          return (
            <button key={ch.id} onClick={() => { setActive(ch); setShowSidebar(false); }}
              className="w-full text-right px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-all"
              style={{
                background: isActive ? 'rgba(46,139,255,0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(46,139,255,0.2)' : '1px solid transparent',
              }}>
              <Hash size={13} style={{ color: isActive ? '#2E8BFF' : '#475569', flexShrink: 0 }} />
              <span className="flex-1 text-sm truncate font-medium"
                style={{ color: isActive ? '#e2e8f0' : '#64748b' }}>
                {ch.name}
              </span>
              {ch.unread > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: '#2E8BFF', minWidth: 18, textAlign: 'center' }}>
                  {ch.unread}
                </span>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-8 text-center text-white/25 text-sm">لا توجد قنوات</div>
        )}
      </div>

      {/* Status footer */}
      <div className="px-4 py-3 flex items-center gap-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-1.5 h-1.5 rounded-full bg-secondary-500" />
        <MessageSquare size={12} className="text-white/20" />
        <span className="text-[11px] text-white/20">Rocket.Chat Engine</span>
      </div>
    </div>
  );

  return (
    <AppShell>
      {/* Header */}
      <header className="glass-chrome sticky top-0 z-20 px-4 py-3 flex items-center gap-3" dir="rtl">
        <Link href="/workspace" className="p-2 -mr-1 rounded-full hover:bg-white/5 transition-colors">
          <ArrowRight size={18} className="text-white/70" />
        </Link>
        {active ? (
          <>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(46,139,255,0.12)', border: '1px solid rgba(46,139,255,0.2)' }}>
              <Hash size={14} className="text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-black text-[15px] truncate">{active.name}</h1>
              <p className="text-white/40 text-[11px]">{active.members} أعضاء</p>
            </div>
          </>
        ) : (
          <h1 className="text-white font-black text-[17px] flex-1">دردشة الشركة</h1>
        )}
        <button onClick={() => setShowSidebar(s => !s)}
          className="p-2 rounded-xl hover:bg-white/5 transition-colors md:hidden">
          <Users size={16} className="text-white/50" />
        </button>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 57px)' }}>

        {/* Messages area */}
        <div className="flex-1 flex flex-col min-w-0">
          {active ? (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2" dir="rtl">
                {loadingMsgs && messages.length === 0 ? (
                  <div className="flex justify-center pt-16">
                    <Loader2 size={20} className="text-primary-500 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-white/30 pt-16">
                    <MessageSquare size={32} />
                    <p className="text-sm">لا توجد رسائل بعد — ابدأ المحادثة</p>
                  </div>
                ) : (
                  <div className="space-y-0.5 pb-2">
                    {messages.map((msg, i) => {
                      const showAvatar = !msg.is_mine && (
                        i === 0 || messages[i - 1]?.sender_name !== msg.sender_name
                      );
                      return <MessageBubble key={msg.id} msg={msg} showAvatar={showAvatar} />;
                    })}
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 pb-4 pt-2" dir="rtl"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-end gap-2">
                  <div className="flex-1 rounded-2xl flex items-end gap-2 px-3 py-2"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={e => {
                        setText(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                      }}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder={`اكتب رسالة في #${active.name}...`}
                      dir="rtl" rows={1}
                      className="flex-1 bg-transparent border-none outline-none text-white text-[14px] resize-none leading-relaxed placeholder:text-white/25"
                      style={{ maxHeight: 120 }}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!text.trim() || sending}
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: text.trim() ? 'linear-gradient(135deg,#2E8BFF,#00D4FF)' : 'rgba(255,255,255,0.05)',
                      border: text.trim() ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    }}>
                    {sending
                      ? <Loader2 size={15} className="animate-spin text-white" />
                      : <Send size={15} style={{ color: text.trim() ? '#0a0a0f' : '#475569' }} />
                    }
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/30">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(46,139,255,0.08)', border: '1px solid rgba(46,139,255,0.15)' }}>
                <MessageSquare size={28} className="text-primary-500/50" />
              </div>
              <p className="text-sm">اختر قناة للبدء</p>
            </div>
          )}
        </div>

        {/* Sidebar — desktop always visible, mobile toggle */}
        <div className="hidden md:block w-[230px] flex-shrink-0">{Sidebar}</div>
        {showSidebar && (
          <div className="fixed inset-0 z-30 md:hidden" onClick={() => setShowSidebar(false)}>
            <div className="absolute left-0 top-0 bottom-0 w-64" onClick={e => e.stopPropagation()}>
              {Sidebar}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
