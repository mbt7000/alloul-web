'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Inbox, CheckCircle2, XCircle, Clock, Bell } from 'lucide-react';
import AppShell from '@/components/AppShell';

type Tab = 'pending' | 'done';

const MOCK_REQUESTS = [
  {
    id: 1, type: 'إجازة', from: 'أحمد محمد', time: 'منذ ساعة',
    detail: 'طلب إجازة سنوية من 20 أبريل حتى 25 أبريل', status: 'pending', color: '#FFB24D',
  },
  {
    id: 2, type: 'صرف مالي', from: 'سارة العلي', time: 'منذ 3 ساعات',
    detail: 'طلب صرف 500 ريال مصاريف سفر', status: 'pending', color: '#2E8BFF',
  },
  {
    id: 3, type: 'وصول', from: 'خالد السعد', time: 'منذ يوم',
    detail: 'طلب صلاحية وصول لنظام CRM', status: 'pending', color: '#8B5CF6',
  },
  {
    id: 4, type: 'إجازة', from: 'نورة القحطاني', time: 'منذ يومين',
    detail: 'إجازة مرضية ليوم واحد', status: 'done', color: '#14E0A4',
  },
];

export default function InboxPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [items, setItems] = useState(MOCK_REQUESTS);

  const visible = items.filter((r) => tab === 'pending' ? r.status === 'pending' : r.status !== 'pending');
  const pendingCount = items.filter((r) => r.status === 'pending').length;

  const approve = (id: number) => setItems((prev) => prev.map((r) => r.id === id ? { ...r, status: 'approved' } : r));
  const reject  = (id: number) => setItems((prev) => prev.map((r) => r.id === id ? { ...r, status: 'rejected' } : r));

  return (
    <AppShell>
      <header className="sticky top-0 z-20 glass-chrome px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5 text-white/70">
            <ArrowRight size={18} />
          </Link>
          <h1 className="text-white font-black text-[17px]">الصندوق</h1>
          {pendingCount > 0 && (
            <div className="w-5 h-5 rounded-full bg-danger flex items-center justify-center">
              <span className="text-white text-[10px] font-black">{pendingCount}</span>
            </div>
          )}
        </div>
      </header>

      <div className="px-4 py-4 pb-24">
        {/* Tabs */}
        <div className="flex bg-white/5 rounded-full p-1 mb-5">
          {([['pending', 'بانتظار الموافقة'], ['done', 'المنتهية']] as [Tab, string][]).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${
                tab === v ? 'bg-gradient-primary text-white' : 'text-white/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="text-center py-20 text-white/40">
            <Inbox size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{tab === 'pending' ? 'لا توجد طلبات معلقة' : 'لا توجد طلبات منتهية'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl border border-white/5 bg-white/[0.02]"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${r.color}20` }}
                  >
                    <Bell size={16} style={{ color: r.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white font-black text-sm">{r.type}</span>
                      <span
                        className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                        style={{ background: `${r.color}25`, color: r.color }}
                      >
                        {r.from}
                      </span>
                    </div>
                    <p className="text-white/60 text-xs leading-relaxed">{r.detail}</p>
                    <p className="text-white/30 text-[10px] mt-1 flex items-center gap-1">
                      <Clock size={9} /> {r.time}
                    </p>
                  </div>
                </div>

                {r.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => approve(r.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary/15 border border-secondary/30 text-secondary text-xs font-bold hover:bg-secondary/25 transition-colors"
                    >
                      <CheckCircle2 size={13} /> موافقة
                    </button>
                    <button
                      onClick={() => reject(r.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-bold hover:bg-danger/20 transition-colors"
                    >
                      <XCircle size={13} /> رفض
                    </button>
                  </div>
                )}

                {r.status !== 'pending' && (
                  <div className={`flex items-center gap-1.5 text-xs font-bold ${r.status === 'approved' ? 'text-secondary' : 'text-danger'}`}>
                    {r.status === 'approved' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    {r.status === 'approved' ? 'تمت الموافقة' : 'مرفوض'}
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
