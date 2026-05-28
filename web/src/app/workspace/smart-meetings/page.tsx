'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Video, Plus, Loader2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getToken } from '@/lib/auth';
import { useCallContext } from '@/context/CallContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.alloul.app';

export default function SmartMeetingsPage() {
  const { mode, startRoom } = useCallContext();
  const [title,    setTitle]    = useState('');
  const [creating, setCreating] = useState(false);

  const createMeeting = async () => {
    if (!title.trim() || mode !== 'idle') return;
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
        startRoom({ ws_url: data.ws_url || 'wss://livekit.alloul.app', token: data.token, title });
        setTitle('');
      } else {
        alert('تعذّر إنشاء الاجتماع');
      }
    } catch {
      alert('تعذّر الاتصال بالسيرفر');
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
              disabled={!title.trim() || creating || mode !== 'idle'}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-40 transition-colors"
              style={{ background: '#F59E0B' }}
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              ابدأ
            </button>
          </div>
        </div>

        <div className="text-center py-16 text-gray-500">
          <Video size={48} className="mx-auto mb-3 opacity-30" />
          <p>اضغط "ابدأ" لإنشاء اجتماع أو انضم عبر صفحة المكالمات</p>
        </div>
      </div>
    </AppShell>
  );
}
