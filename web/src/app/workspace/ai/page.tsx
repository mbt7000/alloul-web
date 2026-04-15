'use client';

/**
 * ALLOUL&Q — AI Assistant (web)
 * -----------------------------
 * Mirrors the mobile AiAssistantScreen. Streams responses from /agent/chat
 * using Server-Sent Events. Company mode, suggestion cards, and
 * quick-analysis shortcuts that hit /agent/analyze.
 *
 * Requires ANTHROPIC_API_KEY on the server. If it's missing, the backend
 * returns a graceful fallback message via the same SSE stream, so the UI
 * still works (it just tells the user to configure the key).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Send, Sparkles, BarChart3, CheckSquare, TrendingUp, Calendar,
  RotateCcw, Loader2,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getToken, isAuthenticated } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.alloul.app';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
};

type Mode = 'company';

const SUGGESTIONS = [
  { icon: BarChart3,  label: 'حلّل لوحة التحكم',  topic: 'dashboard', color: '#2E8BFF' },
  { icon: CheckSquare,label: 'مهام اليوم',        topic: 'tasks',     color: '#14E0A4' },
  { icon: TrendingUp, label: 'الصفقات النشطة',    topic: 'deals',     color: '#00D4FF' },
  { icon: Calendar,   label: 'الاجتماعات القادمة',topic: 'meetings',  color: '#FFB24D' },
];

const STARTER_PROMPTS: Record<Mode, string[]> = {
  company: [
    'ما أولويات اليوم؟',
    'لخّص حالة المشاريع الحالية',
    'أي المهام متأخرة أو معلّقة؟',
    'اقترح خطة لهذا الأسبوع',
  ],
};

export default function AiAssistantPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('company');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated()) router.replace('/login');
  }, [router]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '', streaming: true }]);
    setInput('');
    setSending(true);

    try {
      const token = getToken();
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API_BASE}/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: history, mode }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data) as { text?: string };
            if (parsed.text) {
              accumulated += parsed.text;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m)),
              );
            }
          } catch {}
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
      );
    } catch (e) {
      const status = (e as { status?: number })?.status ?? 0;
      const msg =
        status === 401
          ? 'جلستك انتهت. أعد تسجيل الدخول.'
          : status === 402 || status === 403
            ? 'هذه الميزة تحتاج باقة احترافية — ترقية الخطة مطلوبة.'
            : 'تعذّر الاتصال بالذكاء الاصطناعي. تأكد من الإنترنت أو من إعداد ANTHROPIC_API_KEY على الخادم.';
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: msg, streaming: false } : m)),
      );
    } finally {
      setSending(false);
    }
  }, [messages, mode, sending]);

  const runAnalysis = useCallback(async (topic: string, label: string) => {
    if (analyzing || sending) return;
    setAnalyzing(true);

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: `حلّل: ${label}` };
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '', streaming: true }]);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/agent/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ topic }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { summary: string };
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: data.summary, streaming: false } : m)),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: 'تعذّر التحليل. حاول لاحقاً.', streaming: false } : m,
        ),
      );
    } finally {
      setAnalyzing(false);
    }
  }, [analyzing, sending]);

  const clearChat = () => setMessages([]);

  return (
    <AppShell>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="glass-chrome sticky top-0 z-20 px-4 py-3 flex items-center gap-3">
          <Link href="/workspace" className="p-2 rounded-full hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {/* Animated AI orb — logo at the center, spinning halo outside */}
          <div className="relative w-11 h-11 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full animate-ai-orb-spin opacity-90"
              style={{
                background:
                  'conic-gradient(from 180deg at 50% 50%, #2E8BFF, #00D4FF, #14E0A4, #2E8BFF)',
              }}
            />
            <div className="absolute inset-[2px] rounded-full bg-dark-bg-900 overflow-hidden">
              <Image src="/icon.png" alt="ALLOUL&Q" width={44} height={44} className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="flex-1">
            <h1 className="text-base font-bold">المساعد الذكي</h1>
            <p className="text-xs text-white/60">
              {mode === 'company' ? 'وضع الشركة · مدعوم بـ Claude 4.5' : 'وضع السوشال ميديا'}
            </p>
          </div>

          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-2 rounded-full hover:bg-white/5 transition-colors"
              title="مسح المحادثة"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>


        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Hero */}
              <div className="glass-strong p-8 text-center glass-ring-primary">
                <div className="inline-block mb-4">
                  <div className="relative w-28 h-28 mx-auto">
                    {/* Outer spinning halo */}
                    <div
                      className="absolute -inset-1 rounded-full animate-ai-orb-spin opacity-80 blur-[2px]"
                      style={{
                        background:
                          'conic-gradient(from 180deg at 50% 50%, #2E8BFF, #00D4FF, #14E0A4, #2E8BFF)',
                      }}
                    />
                    {/* Pulsing glow */}
                    <div className="absolute inset-0 rounded-full animate-pulse-glow bg-primary-500/30 blur-xl" />
                    {/* Logo at the core */}
                    <div className="absolute inset-[3px] rounded-full bg-dark-bg-900 overflow-hidden border border-white/10">
                      <Image src="/icon.png" alt="ALLOUL&Q" width={112} height={112} className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-2">مرحباً 👋</h2>
                <p className="text-white/70 mb-6">
                  أنا مساعدك الذكي — أساعدك في تلخيص المهام، تحليل المشاريع، وكتابة التسليمات.
                </p>

                {/* Quick suggestions */}
                {mode === 'company' && (
                  <div className="grid grid-cols-2 gap-3">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.topic}
                        disabled={analyzing || sending}
                        onClick={() => runAnalysis(s.topic, s.label)}
                        className="glass glass-hover p-4 text-right disabled:opacity-50"
                        style={{ borderColor: `${s.color}40` }}
                      >
                        <s.icon className="w-6 h-6 mb-2" style={{ color: s.color }} />
                        <p className="text-sm font-semibold">{s.label}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Starter prompts */}
              <div>
                <p className="text-xs text-white/50 mb-3 text-center">أو جرّب أحد هذه:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {STARTER_PROMPTS[mode].map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      disabled={sending}
                      className="glass-subtle glass-hover px-4 py-2 disabled:opacity-50"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] px-5 py-3 rounded-2xl whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-tr-sm'
                        : 'glass rounded-tl-sm'
                    }`}
                  >
                    {m.content || (m.streaming && (
                      <span className="inline-flex items-center gap-2 text-white/60">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>يفكّر...</span>
                      </span>
                    ))}
                    {m.streaming && m.content && (
                      <span className="inline-block w-1 h-4 bg-accent-500 ml-1 animate-pulse-glow" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="glass-chrome px-4 py-4 sticky bottom-0">
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={mode === 'company' ? 'اسأل عن أعمالك...' : 'اطلب محتوى سوشال ميديا...'}
              disabled={sending}
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 text-white placeholder-white/40 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={sending || !input.trim()}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow-primary disabled:opacity-50 disabled:shadow-none transition-all hover:scale-105 active:scale-95"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <Send className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
