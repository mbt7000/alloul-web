'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';
import { Hash, Send, Plus, MessageSquare, Users, Search } from 'lucide-react';

interface Channel { id: string; name: string; unread: number; last_message: string; members: number; type: string; }
interface Message  { id: string; text: string; sender_name: string; created_at: string; is_mine: boolean; }

function formatTime(ts: string) {
  try { return new Date(ts).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name?.slice(0, 2).toUpperCase() || '??';
  const hue = name ? name.charCodeAt(0) * 13 % 360 : 200;
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, background: `hsl(${hue},60%,35%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: '#fff', fontSize: size * 0.36, fontWeight: 700 }}>{initials}</span>
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

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
    } catch {}
    setLoadingMsgs(false);
  }, []);

  useEffect(() => {
    if (!active) return;
    loadMessages(active);
    pollRef.current = setInterval(() => loadMessages(active), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [active, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !active || sending) return;
    setSending(true);
    const optimistic: Message = { id: Date.now().toString(), text: text.trim(), sender_name: 'أنت', created_at: new Date().toISOString(), is_mine: true };
    setMessages(p => [...p, optimistic]);
    const sent = text.trim();
    setText('');
    try {
      await apiFetch(`/chat/channels/${active.id}/messages`, { method: 'POST', body: JSON.stringify({ text: sent }) });
    } catch {}
    setSending(false);
  };

  const filtered = channels.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', height: '100%', background: '#0f1117', color: '#e2e8f0', fontFamily: 'inherit' }}>

      {/* Sidebar */}
      <div style={{ width: 260, borderRight: '1px solid #1e2433', display: 'flex', flexDirection: 'column', background: '#0d1021' }}>
        <div style={{ padding: '16px 12px 8px' }}>
          <div style={{ background: '#1a1f2e', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={14} color="#64748b" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث في القنوات..." dir="rtl"
              style={{ background: 'none', border: 'none', outline: 'none', color: '#94a3b8', fontSize: 13, width: '100%' }} />
          </div>
        </div>

        <div style={{ padding: '8px 12px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>القنوات</span>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 2 }}>
            <Plus size={14} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
              لا توجد قنوات
            </div>
          )}
          {filtered.map(ch => (
            <button key={ch.id} onClick={() => setActive(ch)}
              style={{
                width: '100%', textAlign: 'right', background: active?.id === ch.id ? '#1e2d4a' : 'none',
                border: 'none', cursor: 'pointer', padding: '8px 14px',
                display: 'flex', alignItems: 'center', gap: 8,
                borderRight: active?.id === ch.id ? '3px solid #3b82f6' : '3px solid transparent',
                transition: 'all 0.15s',
              }}>
              <Hash size={14} color={active?.id === ch.id ? '#3b82f6' : '#475569'} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: active?.id === ch.id ? 600 : 400, color: active?.id === ch.id ? '#e2e8f0' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ch.name}
                  </span>
                  {ch.unread > 0 && (
                    <span style={{ background: '#3b82f6', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>
                      {ch.unread}
                    </span>
                  )}
                </div>
                {ch.last_message && (
                  <p style={{ fontSize: 11, color: '#475569', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ch.last_message}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>

        <div style={{ padding: '12px 14px', borderTop: '1px solid #1e2433' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={14} color="#475569" />
            <span style={{ fontSize: 12, color: '#475569' }}>Rocket.Chat Engine</span>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: '#22c55e', marginRight: 'auto' }} />
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {active ? (
          <>
            {/* Header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2433', display: 'flex', alignItems: 'center', gap: 10, background: '#0f1117' }}>
              <Hash size={16} color="#3b82f6" />
              <span style={{ fontWeight: 700, fontSize: 15 }}>{active.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 'auto' }}>
                <Users size={13} color="#475569" />
                <span style={{ fontSize: 12, color: '#475569' }}>{active.members}</span>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {loadingMsgs && messages.length === 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
                  <div style={{ width: 24, height: 24, border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                </div>
              )}
              {messages.map((msg, i) => {
                const showName = !msg.is_mine && (i === 0 || messages[i - 1]?.sender_name !== msg.sender_name);
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: msg.is_mine ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end', marginBottom: 2 }}>
                    {!msg.is_mine && showName && <Avatar name={msg.sender_name} size={28} />}
                    {!msg.is_mine && !showName && <div style={{ width: 28 }} />}
                    <div style={{ maxWidth: '65%' }}>
                      {showName && !msg.is_mine && (
                        <p style={{ fontSize: 11, color: '#64748b', margin: '0 4px 2px', textAlign: 'right' }}>{msg.sender_name}</p>
                      )}
                      <div style={{
                        background: msg.is_mine ? '#1d4ed8' : '#1e2433',
                        borderRadius: msg.is_mine ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                        padding: '8px 12px', lineHeight: 1.5,
                      }}>
                        <p style={{ margin: 0, fontSize: 14, color: '#e2e8f0', direction: 'rtl' }}>{msg.text}</p>
                      </div>
                      <p style={{ fontSize: 10, color: '#475569', margin: '2px 4px 0', textAlign: msg.is_mine ? 'left' : 'right' }}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 20px 16px', borderTop: '1px solid #1e2433', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <button style={{ width: 36, height: 36, borderRadius: 10, background: '#1e2433', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Plus size={16} color="#64748b" />
              </button>
              <div style={{ flex: 1, background: '#1a1f2e', borderRadius: 12, padding: '8px 14px', border: '1px solid #2d3748' }}>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={`اكتب رسالة في #${active.name}...`}
                  dir="rtl"
                  rows={1}
                  style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 14, resize: 'none', lineHeight: 1.5, maxHeight: 120, overflow: 'auto' }}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!text.trim() || sending}
                style={{
                  width: 36, height: 36, borderRadius: 10, background: text.trim() ? '#2563eb' : '#1e2433',
                  border: 'none', cursor: text.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  transition: 'background 0.2s',
                }}>
                <Send size={15} color={text.trim() ? '#fff' : '#475569'} />
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#475569' }}>
            <MessageSquare size={40} />
            <p style={{ fontSize: 15 }}>اختر قناة للبدء</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
