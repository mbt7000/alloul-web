'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Search, Check, CheckCheck, Clock, RefreshCw } from 'lucide-react';
import AppShell from '@/components/AppShell';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.alloul.app';
import { getToken } from '@/lib/auth';

interface Conversation {
  id: string;
  contact_name: string;
  phone_number: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  status: 'open' | 'resolved';
}

export default function WhatsAppPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    fetch(`${API_BASE}/whatsapp/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : { conversations: [] })
      .then(d => setConversations(d.conversations ?? []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = conversations.filter(c =>
    c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone_number?.includes(search)
  );

  return (
    <AppShell>
      <div className="p-4 max-w-3xl mx-auto" dir="rtl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#25D36620' }}>
            <MessageCircle size={22} style={{ color: '#25D366' }} />
          </div>
          <div>
            <h1 className="text-white font-black text-xl">واتساب بيزنس</h1>
            <p className="text-gray-400 text-sm">محادثات العملاء</p>
          </div>
        </div>

        {/* search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث باسم أو رقم..."
            className="w-full bg-dark-bg-800 border border-white/10 rounded-xl pr-9 pl-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw size={28} className="animate-spin text-gray-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <MessageCircle size={48} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد محادثات بعد</p>
            <p className="text-xs mt-1">اربط حساب WhatsApp Business من الإعدادات</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => (
              <div key={c.id} className="bg-dark-bg-800 border border-white/8 rounded-xl p-4 flex items-center gap-3 hover:border-white/20 transition-colors cursor-pointer">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {c.contact_name?.[0] ?? '#'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-white font-semibold text-sm">{c.contact_name || c.phone_number}</span>
                    <span className="text-gray-500 text-xs">{c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-xs truncate flex-1">{c.last_message}</p>
                    {c.unread_count > 0 && (
                      <span className="mr-2 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
