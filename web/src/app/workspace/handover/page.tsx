'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, RefreshCw, Loader2, AlertTriangle, Plus, X, User, Users } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getHandovers, apiFetch, ApiError, type HandoverRow } from '@/lib/api-client';
import { isAuthenticated, clearToken } from '@/lib/auth';

const RISK_STYLE: Record<string, { label: string; color: string }> = {
  low:      { label: 'منخفض', color: '#14E0A4' },
  medium:   { label: 'متوسط', color: '#F59E0B' },
  high:     { label: 'عالي',  color: '#EF4444' },
  critical: { label: 'حرج',   color: '#DC2626' },
};

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  pending:     { label: 'معلق',     color: '#FFB24D' },
  in_progress: { label: 'جارٍ',     color: '#2E8BFF' },
  completed:   { label: 'مكتمل',   color: '#14E0A4' },
  cancelled:   { label: 'ملغى',    color: '#EF4444' },
};

export default function HandoverPage() {
  const router = useRouter();
  const [rows, setRows] = useState<HandoverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const [hTitle, setHTitle]   = useState('');
  const [hFrom,  setHFrom]    = useState('');
  const [hTo,    setHTo]      = useState('');
  const [hDept,  setHDept]    = useState('');
  const [hContent, setHContent] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    load();
  }, [router]);

  const load = async () => {
    try {
      const data = await getHandovers();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) { clearToken(); router.replace('/login'); }
    } finally { setLoading(false); }
  };

  const createHandover = async () => {
    if (!hTitle.trim()) return;
    setSaving(true);
    try {
      const created = await apiFetch('/handover/', {
        method: 'POST',
        body: JSON.stringify({
          title: hTitle.trim(),
          from_person: hFrom || undefined,
          to_person: hTo || undefined,
          department: hDept || undefined,
          content: hContent || undefined,
          status: 'pending',
        }),
      });
      setRows(prev => [created as HandoverRow, ...prev]);
      setHTitle(''); setHFrom(''); setHTo(''); setHDept(''); setHContent('');
      setShowNew(false);
    } catch { } finally { setSaving(false); }
  };

  return (
    <AppShell>
      <header className="sticky top-0 z-20 bg-dark-bg-900/85 backdrop-blur-xl border-b border-primary/10 px-4 py-3 flex items-center gap-4" dir="rtl">
        <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <ArrowRight size={18} />
        </Link>
        <h1 className="text-white font-black text-[17px] flex-1">التسليمات</h1>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
          style={{ background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.35)', color: '#00D4FF' }}>
          <Plus size={14} /> تسليمة جديدة
        </button>
      </header>

      {/* New Handover Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4" dir="rtl">
          <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(0,212,255,0.3)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-black text-lg">تسليمة جديدة</h2>
              <button onClick={() => setShowNew(false)}><X size={20} className="text-white/40" /></button>
            </div>
            <div className="space-y-3 mb-5">
              <input autoFocus value={hTitle} onChange={e => setHTitle(e.target.value)}
                placeholder="عنوان التسليمة *"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 text-sm" />
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <User size={14} className="absolute right-3 top-3.5 text-white/30" />
                  <input value={hFrom} onChange={e => setHFrom(e.target.value)}
                    placeholder="من (المُسلِّم)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-8 pl-4 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 text-sm" />
                </div>
                <div className="flex-1 relative">
                  <Users size={14} className="absolute right-3 top-3.5 text-white/30" />
                  <input value={hTo} onChange={e => setHTo(e.target.value)}
                    placeholder="إلى (المُستلِم)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-8 pl-4 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 text-sm" />
                </div>
              </div>
              <input value={hDept} onChange={e => setHDept(e.target.value)}
                placeholder="القسم / الفريق"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 text-sm" />
              <textarea rows={4} value={hContent} onChange={e => setHContent(e.target.value)}
                placeholder="تفاصيل التسليمة — المهام، الملاحظات، العملاء المعلقة..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 text-sm resize-none" />
            </div>
            <button onClick={createHandover} disabled={saving || !hTitle.trim()}
              className="w-full py-3 rounded-xl text-white font-black disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(90deg,#00D4FF,#2E8BFF)' }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              إنشاء التسليمة
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-5 pb-24 md:pb-10" dir="rtl">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="text-primary animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-warning/10 border border-warning/30 flex items-center justify-center">
              <RefreshCw size={28} className="text-warning" />
            </div>
            <p className="text-white/70 text-base font-bold mb-2">لا يوجد تسليمات</p>
            <p className="text-white/40 text-sm mb-4">أنشئ تسليمة لتوثيق نقل مهمة بين الموظفين</p>
            <button onClick={() => setShowNew(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.3)', color: '#00D4FF' }}>
              <Plus size={14} className="inline ml-1" />إنشاء تسليمة
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((h) => {
              const risk = RISK_STYLE[(h as any).risk_level ?? 'low'] ?? RISK_STYLE.low;
              const status = STATUS_STYLE[(h as any).status ?? 'pending'] ?? STATUS_STYLE.pending;
              const title = (h as any).title || (h as any).handover_title || 'تسليمة';
              return (
                <div key={h.id}
                  className="rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-cyan-500/20 transition-all p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${risk.color}18`, border: `1px solid ${risk.color}30` }}>
                      <RefreshCw size={18} style={{ color: risk.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-white font-bold text-sm truncate">{title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: `${status.color}18`, color: status.color }}>{status.label}</span>
                        {(h as any).risk_level && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: `${risk.color}18` }}>
                            <AlertTriangle size={9} style={{ color: risk.color }} />
                            <span className="text-[9px] font-bold" style={{ color: risk.color }}>{risk.label}</span>
                          </div>
                        )}
                      </div>
                      {(h as any).client_name && (
                        <p className="text-white/50 text-[11px] mb-1">
                          العميل: <span className="text-white/70">{(h as any).client_name}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-white/40 flex-wrap">
                        {(h as any).from_person && <span className="flex items-center gap-1"><User size={9} />{(h as any).from_person}</span>}
                        {(h as any).from_person && (h as any).to_person && <span>→</span>}
                        {(h as any).to_person && <span className="flex items-center gap-1"><User size={9} />{(h as any).to_person}</span>}
                        {(h as any).department && <><span>·</span><span>{(h as any).department}</span></>}
                      </div>
                      {(h as any).content && (
                        <p className="text-white/40 text-xs mt-2 line-clamp-2">{(h as any).content}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
