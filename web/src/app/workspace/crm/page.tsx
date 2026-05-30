'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, TrendingUp, Loader2, Plus, DollarSign, X } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getDeals, apiFetch, ApiError, type Deal } from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';

const STAGES = [
  { key: 'lead',          label: 'مبدئي',       color: '#8B5CF6' },
  { key: 'qualified',     label: 'مؤهَّل',       color: '#00D4FF' },
  { key: 'proposal',      label: 'عرض سعر',     color: '#2E8BFF' },
  { key: 'negotiation',   label: 'تفاوض',       color: '#FFB24D' },
  { key: 'won',           label: 'ناجحة',       color: '#14E0A4' },
  { key: 'lost',          label: 'خسرت',        color: '#FF4757' },
];

export default function CrmPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dCompany, setDCompany] = useState('');
  const [dValue, setDValue] = useState('');
  const [dStage, setDStage] = useState('lead');
  const [dProb, setDProb] = useState('50');

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    (async () => {
      try {
        const data = await getDeals();
        setDeals(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) router.replace('/login');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const createDeal = async () => {
    if (!dCompany.trim()) return;
    setSaving(true);
    try {
      const created = await apiFetch('/deals/', {
        method: 'POST',
        body: JSON.stringify({
          company: dCompany.trim(),
          value: parseFloat(dValue) || 0,
          stage: dStage,
          probability: parseInt(dProb) || 50,
        }),
      });
      setDeals(prev => [created as Deal, ...prev]);
      setDCompany(''); setDValue(''); setDStage('lead'); setDProb('50');
      setShowNew(false);
    } catch { } finally { setSaving(false); }
  };

  const { pipeline, wonTotal, activeCount } = useMemo(() => {
    const active = deals.filter((d) => !['won', 'lost'].includes(d.stage));
    return {
      pipeline: active.reduce((s, d) => s + (d.value || 0), 0),
      wonTotal: deals.filter((d) => d.stage === 'won').reduce((s, d) => s + (d.value || 0), 0),
      activeCount: active.length,
    };
  }, [deals]);

  const byStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const s of STAGES) map[s.key] = [];
    for (const d of deals) (map[d.stage] ??= []).push(d);
    return map;
  }, [deals]);

  return (
    <AppShell>
      <header className="glass-chrome sticky top-0 z-20 px-4 py-3 flex items-center gap-4">
        <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <ArrowRight size={18} />
        </Link>
        <h1 className="text-white font-black text-[17px] flex-1">CRM · الصفقات</h1>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
          style={{ background: 'rgba(46,139,255,0.15)', border: '1px solid rgba(46,139,255,0.35)', color: '#2E8BFF' }}>
          <Plus size={14} /> صفقة جديدة
        </button>
      </header>

      {/* New Deal Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4" dir="rtl">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(46,139,255,0.3)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-black text-lg">صفقة جديدة</h2>
              <button onClick={() => setShowNew(false)}><X size={20} className="text-white/40" /></button>
            </div>
            <div className="space-y-3 mb-5">
              <input autoFocus value={dCompany} onChange={e => setDCompany(e.target.value)}
                placeholder="اسم العميل / الشركة *"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
              <input type="number" value={dValue} onChange={e => setDValue(e.target.value)}
                placeholder="قيمة الصفقة ($)"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
              <div>
                <label className="text-white/50 text-xs mb-2 block">المرحلة</label>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map(s => (
                    <button key={s.key} onClick={() => setDStage(s.key)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: dStage === s.key ? `${s.color}22` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${dStage === s.key ? s.color : 'rgba(255,255,255,0.08)'}`,
                        color: dStage === s.key ? s.color : 'rgba(255,255,255,0.4)',
                      }}>{s.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-white/50 text-xs w-20">احتمالية %</label>
                <input type="range" min="0" max="100" value={dProb} onChange={e => setDProb(e.target.value)} className="flex-1" />
                <span className="text-white font-bold text-sm w-10 text-left">{dProb}%</span>
              </div>
            </div>
            <button onClick={createDeal} disabled={saving || !dCompany.trim()}
              className="w-full py-3 rounded-xl text-white font-black disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(90deg,#2E8BFF,#00D4FF)' }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              إضافة الصفقة
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-5 pb-24 md:pb-10 max-w-5xl mx-auto">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass glass-ring-primary p-4">
            <p className="text-xs text-white/60">خط الأنابيب</p>
            <p className="text-xl font-black text-primary-500 mt-1">
              {pipeline.toLocaleString('en')} <span className="text-xs">$</span>
            </p>
          </div>
          <div className="glass glass-ring-secondary p-4">
            <p className="text-xs text-white/60">الصفقات الناجحة</p>
            <p className="text-xl font-black text-secondary-500 mt-1">
              {wonTotal.toLocaleString('en')} <span className="text-xs">$</span>
            </p>
          </div>
          <div className="glass glass-ring-accent p-4">
            <p className="text-xs text-white/60">نشطة</p>
            <p className="text-xl font-black text-accent-500 mt-1">{activeCount}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="text-primary-500 animate-spin" />
          </div>
        ) : deals.length === 0 ? (
          <div className="glass p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center">
              <TrendingUp size={28} className="text-primary-500" />
            </div>
            <p className="text-white/70 font-bold mb-2">لا يوجد صفقات بعد</p>
            <p className="text-white/40 text-sm">ابدأ بإضافة أول صفقة لفريقك</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {STAGES.map((s) => (
              <div key={s.key} className="glass p-3 min-h-[200px]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold" style={{ color: s.color }}>{s.label}</p>
                  <span className="text-[10px] text-white/40">{byStage[s.key]?.length ?? 0}</span>
                </div>
                <div className="space-y-2">
                  {(byStage[s.key] ?? []).slice(0, 8).map((d) => (
                    <div key={d.id} className="bg-white/[0.04] border border-white/10 rounded-xl p-2">
                      <p className="text-xs font-semibold truncate">{d.company}</p>
                      <p className="text-[11px] text-white/60 flex items-center gap-1 mt-1">
                        <DollarSign size={10} />
                        {(d.value || 0).toLocaleString('en')}
                        {d.probability != null && <span className="text-white/40">· {d.probability}%</span>}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
