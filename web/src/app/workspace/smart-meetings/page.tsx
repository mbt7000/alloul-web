'use client';

import { useState } from 'react';
import { Zap, Video, FileText, Users, Plus, Loader2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.alloul.app';
import { getToken } from '@/lib/auth';

interface Meeting {
  id: string;
  title: string;
  room_url: string;
  transcript?: string;
  action_items?: string[];
  created_at: string;
}

export default function SmartMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);

  const createMeeting = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/livekit/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const data = await res.json();
        setMeetings(prev => [{ id: data.room_name, title, room_url: data.room_url, created_at: new Date().toISOString() }, ...prev]);
        setActiveRoom(data.room_url);
        setTitle('');
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell>
      <div className="p-4 max-w-3xl mx-auto" dir="rtl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F59E0B20' }}>
            <Zap size={22} style={{ color: '#F59E0B' }} />
          </div>
          <div>
            <h1 className="text-white font-black text-xl">اجتماعات ذكية</h1>
            <p className="text-gray-400 text-sm">تسجيل + ملخص AI تلقائي</p>
          </div>
        </div>

        {/* create meeting */}
        <div className="bg-dark-bg-800 border border-white/10 rounded-2xl p-4 mb-6">
          <p className="text-white font-semibold mb-3 text-sm">اجتماع جديد</p>
          <div className="flex gap-2">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createMeeting()}
              placeholder="عنوان الاجتماع..."
              className="flex-1 bg-dark-bg-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none"
            />
            <button
              onClick={createMeeting}
              disabled={!title.trim() || creating}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-40 transition-colors"
              style={{ background: '#F59E0B' }}
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              ابدأ
            </button>
          </div>
        </div>

        {/* active room */}
        {activeRoom && (
          <div className="bg-dark-bg-800 border border-yellow-500/30 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white font-bold text-sm">اجتماع نشط</span>
            </div>
            <a
              href={activeRoom}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-yellow-400 text-sm font-semibold hover:underline"
            >
              <Video size={16} />
              انضم للاجتماع
            </a>
          </div>
        )}

        {/* past meetings */}
        {meetings.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Zap size={48} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد اجتماعات سابقة</p>
            <p className="text-xs mt-1">بعد انتهاء الاجتماع يظهر الملخص وبنود العمل تلقائياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map(m => (
              <div key={m.id} className="bg-dark-bg-800 border border-white/8 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Video size={16} className="text-yellow-400" />
                  <span className="text-white font-semibold text-sm">{m.title}</span>
                  <span className="text-gray-500 text-xs mr-auto">{new Date(m.created_at).toLocaleDateString('ar')}</span>
                </div>
                {m.transcript && (
                  <div className="mt-2 p-3 bg-dark-bg-900 rounded-lg">
                    <p className="text-gray-300 text-xs flex items-start gap-2">
                      <FileText size={12} className="mt-0.5 text-gray-500 flex-shrink-0" />
                      {m.transcript}
                    </p>
                  </div>
                )}
                {m.action_items && m.action_items.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {m.action_items.map((item, i) => (
                      <p key={i} className="text-xs text-gray-400 flex items-start gap-2">
                        <span className="text-yellow-400 mt-0.5">•</span>{item}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
