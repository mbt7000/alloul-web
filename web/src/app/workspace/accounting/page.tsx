'use client';

/**
 * شكرة — نظام المحاسبة الذكي
 * نظام محاسبة متكامل: مبيعات، مشتريات، رأس المال، تقارير، صلاحيات
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, TrendingUp, TrendingDown, DollarSign, AlertCircle,
  ExternalLink, Plus, RefreshCw, Loader2, CheckCircle,
  BarChart3, Settings, Copy, Check, MessageCircle, Phone,
  Shield, Users, Trash2, UserPlus, Eye, Lock,
  Search, Wallet, ShoppingBag, List, LayoutDashboard,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getToken, isAuthenticated } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.alloul.app';

// ── Types ──────────────────────────────────────────────────────────────────────

type DashboardData = {
  period: { year: number; month: number };
  summary: { total_income: number; total_expense: number; net_profit: number; pending_review: number };
  breakdown: { type: string; category: string; total: number; count: number }[];
  trend: { year: number; month: number; income: number; expense: number }[];
  setup: {
    has_google_sheet: boolean; has_whatsapp: boolean;
    google_sheet_url: string | null; currency: string;
    show_balances?: boolean; show_profits?: boolean;
    show_amounts?: boolean; show_vendors?: boolean;
    show_reports?: boolean; employees_can_add?: boolean;
    initial_capital?: number; current_balance?: number;
  };
  is_founder?: boolean;
};

type Rec = {
  id: number; record_type: 'income' | 'expense';
  amount: number; currency: string; category: string | null;
  vendor: string | null; description: string | null;
  payment_status: string; recorded_at: string;
  source: string; external_ref: string | null;
  ai_confidence: number | null; needs_review: boolean;
  created_at: string;
};

type BotInfo = {
  service_email: string; webhook_telegram: string; webhook_whatsapp: string;
  verify_token: string; telegram_active: boolean; whatsapp_active: boolean;
};

type Permission = {
  user_id: number; name: string; username?: string;
  can_view_dashboard: boolean; can_view_amounts: boolean; can_view_profits: boolean;
  can_view_reports: boolean; can_view_vendors: boolean; can_add_records: boolean;
  can_edit_records: boolean; can_delete_records: boolean; can_use_bot: boolean;
};

type Tab = 'overview' | 'sales' | 'purchases' | 'records' | 'settings';

// ── Constants ─────────────────────────────────────────────────────────────────

const ARABIC_MONTHS = ['','يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const INCOME_CATS   = ['مبيعات','خدمات','استثمارات','عمولة','أخرى'];
const EXPENSE_CATS  = ['رواتب','إيجار','مشتريات','مصاريف تشغيل','تسويق','ضرائب','أخرى'];
const CURRENCIES    = ['SAR','AED','USD','EUR','KWD','BHD','OMR','QAR','JOD','EGP','GBP'];
const PAY_STATUS: Record<string,{label:string;cls:string}> = {
  paid:    { label: 'مدفوع', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  pending: { label: 'معلق',  cls: 'bg-amber-500/20  text-amber-400  border-amber-500/30'  },
  partial: { label: 'جزئي',  cls: 'bg-blue-500/20   text-blue-400   border-blue-500/30'   },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="flex-1 ml-3">
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-white/40 mt-0.5">{desc}</p>}
      </div>
      <button onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-emerald-500' : 'bg-white/20'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${value ? 'right-0.5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function PayBadge({ status }: { status: string }) {
  const s = PAY_STATUS[status] ?? PAY_STATUS.paid;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.cls}`}>{s.label}</span>;
}

function RecordRow({ rec, fmt, showAmt, showVen }: { rec: Rec; fmt: (n:number)=>string; showAmt: boolean; showVen: boolean }) {
  const isInc = rec.record_type === 'income';
  const dateStr = new Date(rec.recorded_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isInc ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
        {isInc ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {showVen && rec.vendor && <span className="text-sm font-medium truncate max-w-[140px]">{rec.vendor}</span>}
          {rec.category && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${isInc ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {rec.category}
            </span>
          )}
        </div>
        <p className="text-[11px] text-white/40 mt-0.5">
          {dateStr}
          {rec.needs_review && <span className="text-amber-400 mr-2">⚠ مراجعة</span>}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`text-sm font-bold ${isInc ? 'text-emerald-400' : 'text-red-400'}`}>
          {showAmt ? `${isInc ? '+' : '-'}${fmt(rec.amount)}` : '••••'}
        </span>
        <PayBadge status={rec.payment_status ?? 'paid'} />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AccountingPage() {
  const router = useRouter();

  const [data,       setData]       = useState<DashboardData | null>(null);
  const [botInfo,    setBotInfo]    = useState<BotInfo | null>(null);
  const [records,    setRecords]    = useState<Rec[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const [activeTab,  setActiveTab]  = useState<Tab>('overview');
  const [addOpen,    setAddOpen]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [copied,     setCopied]     = useState<string|null>(null);

  // Record form
  const emptyForm = () => ({
    record_type: 'expense' as 'income'|'expense',
    amount: '', currency: 'SAR', category: '',
    vendor: '', description: '', payment_status: 'paid',
    external_ref: '', recorded_at: new Date().toISOString().split('T')[0],
  });
  const [form, setForm] = useState(emptyForm());

  // Filter / search
  const [search,     setSearch]     = useState('');
  const [filterType, setFilterType] = useState<'all'|'income'|'expense'>('all');

  // Setup form
  const [tgToken,         setTgToken]         = useState('');
  const [waNumId,         setWaNumId]         = useState('');
  const [waToken,         setWaToken]         = useState('');
  const [sheetUrl,        setSheetUrl]        = useState('');
  const [currency,        setCurrency]        = useState('SAR');
  const [initialCapital,  setInitialCapital]  = useState('');
  const [settingsTab,     setSettingsTab]     = useState<'sheet'|'telegram'|'whatsapp'|'privacy'|'permissions'>('sheet');

  // Privacy
  const [pShowBal,  setPShowBal]  = useState(true);
  const [pShowProf, setPShowProf] = useState(true);
  const [pShowAmt,  setPShowAmt]  = useState(true);
  const [pShowVen,  setPShowVen]  = useState(true);
  const [pShowRep,  setPShowRep]  = useState(true);
  const [pEmpAdd,   setPEmpAdd]   = useState(true);

  // Permissions
  const [perms,       setPerms]       = useState<Permission[]>([]);
  const [permLoad,    setPermLoad]    = useState(false);
  const [newUserId,   setNewUserId]   = useState('');
  const [preset,      setPreset]      = useState<'viewer'|'editor'|'full'>('viewer');
  const [grantSaving, setGrantSaving] = useState(false);

  useEffect(() => { if (!isAuthenticated()) router.replace('/login'); }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const h = getToken() ? { Authorization: `Bearer ${getToken()}` } : {} as Record<string,string>;
      const [d1, d2] = await Promise.all([
        fetch(`${API_BASE}/accounting/dashboard`, { headers: h }).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/accounting/bot/info`,  { headers: h }).then(r => r.ok ? r.json() : null),
      ]);
      setData(d1); setBotInfo(d2);
      if (d1?.setup) {
        if (d1.setup.google_sheet_url) setSheetUrl(d1.setup.google_sheet_url);
        if (d1.setup.initial_capital != null) setInitialCapital(String(d1.setup.initial_capital));
        setPShowBal(d1.setup.show_balances ?? true);
        setPShowProf(d1.setup.show_profits ?? true);
        setPShowAmt(d1.setup.show_amounts ?? true);
        setPShowVen(d1.setup.show_vendors ?? true);
        setPShowRep(d1.setup.show_reports ?? true);
        setPEmpAdd(d1.setup.employees_can_add ?? true);
      }
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, []);

  const loadRecs = useCallback(async (type?: 'income'|'expense') => {
    setRecLoading(true);
    try {
      const h = getToken() ? { Authorization: `Bearer ${getToken()}` } : {} as Record<string,string>;
      const url = `${API_BASE}/accounting/records/recent?limit=50${type ? `&record_type=${type}` : ''}`;
      const r = await fetch(url, { headers: h });
      if (r.ok) setRecords(await r.json());
    } catch { /* empty */ }
    finally { setRecLoading(false); }
  }, []);

  const loadPerms = useCallback(async () => {
    setPermLoad(true);
    try {
      const h = getToken() ? { Authorization: `Bearer ${getToken()}` } : {} as Record<string,string>;
      const r = await fetch(`${API_BASE}/accounting/permissions`, { headers: h });
      if (r.ok) setPerms(await r.json());
    } catch { /* empty */ }
    finally { setPermLoad(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (activeTab === 'sales')     loadRecs('income');
    else if (activeTab === 'purchases') loadRecs('expense');
    else if (activeTab === 'records')   loadRecs();
  }, [activeTab, loadRecs]);
  useEffect(() => {
    if (activeTab === 'settings' && settingsTab === 'permissions') loadPerms();
  }, [activeTab, settingsTab, loadPerms]);

  const copyText = (t: string, k: string) => {
    navigator.clipboard.writeText(t); setCopied(k);
    setTimeout(() => setCopied(null), 2000);
  };

  const saveSetup = async () => {
    setSaving(true);
    try {
      const h = { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) };
      await fetch(`${API_BASE}/accounting/setup`, {
        method: 'POST', headers: h,
        body: JSON.stringify({
          google_sheet_url: sheetUrl || null,
          telegram_bot_token: tgToken || null,
          whatsapp_phone_number_id: waNumId || null,
          whatsapp_access_token: waToken || null,
          currency,
          initial_capital: initialCapital ? parseFloat(initialCapital) : null,
          show_balances: pShowBal, show_profits: pShowProf, show_amounts: pShowAmt,
          show_vendors: pShowVen, show_reports: pShowRep, employees_can_add: pEmpAdd,
        }),
      });
      load();
    } catch { alert('تعذر الحفظ.'); }
    finally { setSaving(false); }
  };

  const saveRecord = async () => {
    if (!form.amount || !form.category) return;
    setSaving(true);
    try {
      const h = { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) };
      await fetch(`${API_BASE}/accounting/records`, {
        method: 'POST', headers: h,
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          recorded_at: form.recorded_at ? new Date(form.recorded_at).toISOString() : new Date().toISOString(),
          vendor: form.vendor || null, description: form.description || null,
          external_ref: form.external_ref || null, source: 'manual',
        }),
      });
      setAddOpen(false); setForm(emptyForm()); load();
      if (activeTab === 'sales') loadRecs('income');
      else if (activeTab === 'purchases') loadRecs('expense');
      else if (activeTab === 'records') loadRecs();
    } catch { alert('تعذر الحفظ.'); }
    finally { setSaving(false); }
  };

  const grantPerm = async () => {
    if (!newUserId.trim()) return;
    setGrantSaving(true);
    const presets = {
      viewer: { can_view_dashboard:true, can_view_amounts:false, can_view_profits:false, can_view_reports:false, can_view_vendors:false, can_add_records:false, can_edit_records:false, can_delete_records:false, can_use_bot:false },
      editor: { can_view_dashboard:true, can_view_amounts:true,  can_view_profits:false, can_view_reports:false, can_view_vendors:true,  can_add_records:true,  can_edit_records:false, can_delete_records:false, can_use_bot:true  },
      full:   { can_view_dashboard:true, can_view_amounts:true,  can_view_profits:true,  can_view_reports:true,  can_view_vendors:true,  can_add_records:true,  can_edit_records:true,  can_delete_records:false, can_use_bot:true  },
    };
    try {
      const h = { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) };
      const r = await fetch(`${API_BASE}/accounting/permissions`, {
        method: 'POST', headers: h,
        body: JSON.stringify({ user_id: parseInt(newUserId), ...presets[preset] }),
      });
      if (r.ok) { setNewUserId(''); loadPerms(); }
      else { const e = await r.json(); alert(e.detail || 'تعذر الإضافة'); }
    } catch { alert('تعذر الإضافة.'); }
    finally { setGrantSaving(false); }
  };

  const revokePerm = async (uid: number) => {
    if (!confirm('إلغاء صلاحيات هذا الموظف؟')) return;
    try {
      const h = getToken() ? { Authorization: `Bearer ${getToken()}` } : {} as Record<string,string>;
      await fetch(`${API_BASE}/accounting/permissions/${uid}`, { method: 'DELETE', headers: h });
      loadPerms();
    } catch { /* empty */ }
  };

  // Derived
  const isFounder  = data?.is_founder ?? false;
  const showAmt    = isFounder || (data?.setup.show_amounts ?? true);
  const showVen    = isFounder || (data?.setup.show_vendors ?? true);
  const showBal    = isFounder || (data?.setup.show_balances ?? true);
  const showProf   = isFounder || (data?.setup.show_profits ?? true);

  const fmt = (n: number) => {
    try { return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: data?.setup.currency || 'SAR', maximumFractionDigits: 0 }).format(n); }
    catch { return n.toFixed(0); }
  };
  const mask = (n: number, show: boolean) => show ? fmt(n) : '••••';

  const maxTrend = data ? Math.max(...data.trend.map(t => Math.max(t.income, t.expense)), 1) : 1;
  const top5 = [...(data?.breakdown ?? [])].sort((a,b) => b.total - a.total).slice(0, 5);
  const filtered = records.filter(r => {
    const okType = filterType === 'all' || r.record_type === (filterType === 'income' ? 'income' : 'expense');
    const q = search.toLowerCase();
    return okType && (!q || r.vendor?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q));
  });

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',   label: 'الرئيسية', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'sales',      label: 'مبيعات',   icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'purchases',  label: 'مشتريات',  icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'records',    label: 'السجلات',  icon: <List className="w-4 h-4" /> },
    { id: 'settings',   label: 'إعداد',    icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <AppShell>
      <div className="min-h-screen flex flex-col">

        {/* Header */}
        <div className="glass-chrome sticky top-0 z-20 px-4 py-3 flex items-center gap-3">
          <Link href="/workspace" className="p-2 rounded-full hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold">ش</div>
          <div className="flex-1">
            <h1 className="text-sm font-bold">شكرة — المحاسب الذكي</h1>
            {data?.setup.google_sheet_url && (
              <a href={data.setup.google_sheet_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-emerald-400">
                <ExternalLink className="w-3 h-3" /> Google Sheet
              </a>
            )}
          </div>
          <button onClick={load} className="p-2 rounded-full hover:bg-white/5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="glass-chrome sticky top-[57px] z-10 flex border-b border-white/5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2.5 text-[11px] font-semibold flex flex-col items-center gap-0.5 transition-colors ${activeTab === t.id ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-white/40'}`}>
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 max-w-3xl mx-auto w-full pb-24">

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-primary-500" /></div>
          ) : (

            <>
              {/* ── Overview Tab ── */}
              {activeTab === 'overview' && (
                <div className="space-y-4">

                  {/* رأس المال الحالي */}
                  <div className="glass p-5 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="w-4 h-4 text-violet-400" />
                      <span className="text-xs text-white/60">رأس المال الحالي</span>
                    </div>
                    <p className="text-3xl font-black text-violet-400">
                      {mask(data?.setup.current_balance ?? 0, showBal)}
                    </p>
                    <p className="text-[11px] text-white/30 mt-1.5">
                      رأس المال الأولي: {mask(data?.setup.initial_capital ?? 0, showBal)}
                    </p>
                    <div className="mt-3 flex items-center gap-4 border-t border-white/5 pt-3">
                      <div>
                        <p className="text-[10px] text-white/40">إجمالي الوارد</p>
                        <p className="text-sm font-bold text-emerald-400">{mask(data?.summary.total_income ?? 0, showBal)}</p>
                      </div>
                      <div className="w-px h-6 bg-white/10" />
                      <div>
                        <p className="text-[10px] text-white/40">إجمالي الصادر</p>
                        <p className="text-sm font-bold text-red-400">{mask(data?.summary.total_expense ?? 0, showBal)}</p>
                      </div>
                      <div className="w-px h-6 bg-white/10" />
                      <div>
                        <p className="text-[10px] text-white/40">صافي الشهر</p>
                        <p className={`text-sm font-bold ${(data?.summary.net_profit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {mask(data?.summary.net_profit ?? 0, showProf)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 6-month Trend */}
                  {data && data.trend.length > 0 && (
                    <div className="glass p-5 rounded-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-primary-400" />
                          <h3 className="text-sm font-semibold">آخر 6 أشهر</h3>
                        </div>
                        <div className="flex gap-3 text-[10px] text-white/40">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>إيرادات</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>مصروفات</span>
                        </div>
                      </div>
                      <div className="flex items-end gap-2 h-28">
                        {data.trend.map((t, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex gap-0.5 items-end h-20">
                              <div className="flex-1 bg-emerald-500/60 rounded-t" style={{ height: `${(t.income / maxTrend) * 100}%` }} />
                              <div className="flex-1 bg-red-500/60 rounded-t"     style={{ height: `${(t.expense / maxTrend) * 100}%` }} />
                            </div>
                            <span className="text-[9px] text-white/40">{ARABIC_MONTHS[t.month]?.slice(0,3)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Categories */}
                  {top5.length > 0 && (
                    <div className="glass p-5 rounded-2xl">
                      <h3 className="text-sm font-semibold mb-3">أكثر الفئات نشاطاً</h3>
                      {top5.map((b, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${b.type === 'income' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            <span className="text-sm">{b.category}</span>
                            <span className="text-xs text-white/30">({b.count})</span>
                          </div>
                          <span className={`text-sm font-bold ${b.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {mask(b.total, showAmt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bot Status */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: MessageCircle, label: 'Telegram Bot', active: botInfo?.telegram_active },
                      { icon: Phone,         label: 'WhatsApp',      active: botInfo?.whatsapp_active },
                    ].map(b => (
                      <div key={b.label} className={`glass p-3 flex items-center gap-2 rounded-xl border ${b.active ? 'border-emerald-500/30' : 'border-white/5'}`}>
                        <b.icon className={`w-4 h-4 ${b.active ? 'text-emerald-400' : 'text-white/20'}`} />
                        <div>
                          <p className="text-xs font-semibold">{b.label}</p>
                          <p className={`text-[10px] ${b.active ? 'text-emerald-400' : 'text-white/30'}`}>{b.active ? 'مفعّل ✓' : 'غير مفعّل'}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pending review warning */}
                  {(data?.summary.pending_review ?? 0) > 0 && (
                    <div className="glass border border-amber-500/20 p-4 rounded-2xl flex items-center gap-3">
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <p className="text-sm text-amber-300">{data?.summary.pending_review} سجل بانتظار المراجعة</p>
                    </div>
                  )}

                  {/* Privacy note */}
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-white/40">تفاصيل الفواتير محفوظة في Google Sheet الخاص بشركتك — ALLOUL لا يراها.</p>
                  </div>
                </div>
              )}

              {/* ── Sales Tab ── */}
              {activeTab === 'sales' && (
                <div className="space-y-4">
                  <div className="glass p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/50">إجمالي المبيعات — هذا الشهر</p>
                      <p className="text-2xl font-black text-emerald-400">{mask(data?.summary.total_income ?? 0, showAmt)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                  <div className="glass p-4 rounded-2xl">
                    <h3 className="text-sm font-semibold mb-3">آخر المبيعات</h3>
                    {recLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
                    ) : records.length === 0 ? (
                      <p className="text-sm text-white/30 text-center py-6">لا توجد مبيعات بعد</p>
                    ) : records.map(r => <RecordRow key={r.id} rec={r} fmt={fmt} showAmt={showAmt} showVen={showVen} />)}
                  </div>
                </div>
              )}

              {/* ── Purchases Tab ── */}
              {activeTab === 'purchases' && (
                <div className="space-y-4">
                  <div className="glass p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/50">إجمالي المشتريات — هذا الشهر</p>
                      <p className="text-2xl font-black text-red-400">{mask(data?.summary.total_expense ?? 0, showAmt)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-red-400" />
                    </div>
                  </div>
                  <div className="glass p-4 rounded-2xl">
                    <h3 className="text-sm font-semibold mb-3">آخر المشتريات</h3>
                    {recLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
                    ) : records.length === 0 ? (
                      <p className="text-sm text-white/30 text-center py-6">لا توجد مشتريات بعد</p>
                    ) : records.map(r => <RecordRow key={r.id} rec={r} fmt={fmt} showAmt={showAmt} showVen={showVen} />)}
                  </div>
                </div>
              )}

              {/* ── All Records Tab ── */}
              {activeTab === 'records' && (
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input type="text" placeholder="ابحث بالجهة أو الوصف أو الفئة..." value={search}
                      onChange={e => setSearch(e.target.value)} dir="rtl"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-sm text-white placeholder-white/30 focus:border-emerald-500 focus:outline-none" />
                  </div>
                  {/* Filter chips */}
                  <div className="flex gap-2">
                    {([['all','الكل'],['income','إيرادات'],['expense','مصروفات']] as const).map(([t,l]) => (
                      <button key={t} onClick={() => setFilterType(t)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${filterType === t
                          ? t === 'income' ? 'bg-emerald-500 border-emerald-500 text-white'
                          : t === 'expense' ? 'bg-red-500 border-red-500 text-white'
                          : 'bg-white/10 border-white/20 text-white'
                          : 'border-white/10 text-white/50'}`}>
                        {l}
                      </button>
                    ))}
                    <span className="mr-auto text-xs text-white/30 self-center">{filtered.length} سجل</span>
                  </div>
                  {/* List */}
                  <div className="glass p-4 rounded-2xl">
                    {recLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
                    ) : filtered.length === 0 ? (
                      <p className="text-sm text-white/30 text-center py-6">لا توجد سجلات</p>
                    ) : filtered.map(r => <RecordRow key={r.id} rec={r} fmt={fmt} showAmt={showAmt} showVen={showVen} />)}
                  </div>
                </div>
              )}

              {/* ── Settings Tab ── */}
              {activeTab === 'settings' && (
                <div className="space-y-4">
                  {/* Sub-tabs */}
                  <div className="flex gap-1 bg-white/5 rounded-xl p-1 overflow-x-auto">
                    {([
                      ['sheet',       '📊 شيت'],
                      ['telegram',    '✈️ تلغرام'],
                      ['whatsapp',    '📱 واتساب'],
                      ...(isFounder ? [['privacy','🔒 خصوصية'],['permissions','👥 صلاحيات']] as const : []),
                    ] as [string,string][]).map(([k,label]) => (
                      <button key={k} onClick={() => setSettingsTab(k as typeof settingsTab)}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${settingsTab === k ? 'bg-emerald-500 text-white' : 'text-white/60'}`}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Sheet tab */}
                  {settingsTab === 'sheet' && (
                    <div className="space-y-3">
                      <div className="glass p-4 rounded-2xl space-y-2 text-xs text-white/60">
                        <p className="font-semibold text-white">خطوات ربط Google Sheet:</p>
                        <p>١. أنشئ ملفاً في <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">sheets.google.com</a></p>
                        <p>٢. اضغط <strong>Share</strong> وأضف هذا الإيميل كـ Editor:</p>
                        <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                          <code className="text-emerald-400 text-[11px] flex-1 break-all">{botInfo?.service_email || 'firebase-adminsdk-fbsvc@alloul.iam.gserviceaccount.com'}</code>
                          <button onClick={() => copyText(botInfo?.service_email || 'firebase-adminsdk-fbsvc@alloul.iam.gserviceaccount.com', 'email')} className="text-white/40 hover:text-white">
                            {copied === 'email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <p>٣. الصق رابط الشيت أدناه</p>
                      </div>
                      <input type="url" placeholder="https://docs.google.com/spreadsheets/d/..." value={sheetUrl} onChange={e => setSheetUrl(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none" />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-white/40 mb-1.5">العملة الافتراضية</p>
                          <select value={currency} onChange={e => setCurrency(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none text-sm">
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="text-xs text-white/40 mb-1.5">رأس المال الأولي</p>
                          <input type="number" placeholder="0" value={initialCapital} onChange={e => setInitialCapital(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none text-sm" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Telegram tab */}
                  {settingsTab === 'telegram' && (
                    <div className="space-y-3">
                      <div className="glass p-4 rounded-2xl space-y-2 text-xs text-white/60">
                        <p className="font-semibold text-white">ربط Telegram Bot:</p>
                        <p>١. ابحث عن <strong className="text-white">@BotFather</strong> في تيلغرام</p>
                        <p>٢. أرسل <code className="bg-white/10 px-1 rounded">/newbot</code></p>
                        <p>٣. انسخ الـ Token والصقه أدناه</p>
                        <p className="text-emerald-400">✅ الـ Webhook يُضبط تلقائياً</p>
                      </div>
                      <input type="text" placeholder="1234567890:AAFxxxxxxxxxx" value={tgToken} onChange={e => setTgToken(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none font-mono" />
                      {botInfo?.webhook_telegram && (
                        <div className="glass-subtle p-3 rounded-xl">
                          <p className="text-xs text-white/40 mb-1">Webhook URL</p>
                          <div className="flex items-center gap-2">
                            <code className="text-[10px] text-white/60 flex-1 break-all">{botInfo.webhook_telegram}</code>
                            <button onClick={() => copyText(botInfo.webhook_telegram, 'tg')} className="text-white/30 hover:text-white flex-shrink-0">
                              {copied === 'tg' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* WhatsApp tab */}
                  {settingsTab === 'whatsapp' && (
                    <div className="space-y-3">
                      <div className="glass p-4 rounded-2xl space-y-2 text-xs text-white/60">
                        <p className="font-semibold text-white">ربط WhatsApp Business API:</p>
                        <p>١. افتح <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">Meta Developers</a></p>
                        <p>٢. أضف منتج WhatsApp وأنشئ تطبيقاً</p>
                        <p>٣. احصل على Phone Number ID و Access Token</p>
                        {botInfo?.webhook_whatsapp && (
                          <>
                            <p>٤. Webhook URL:</p>
                            <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                              <code className="text-emerald-400 text-[10px] flex-1 break-all">{botInfo.webhook_whatsapp}</code>
                              <button onClick={() => copyText(botInfo.webhook_whatsapp, 'wa')} className="text-white/30 hover:text-white">
                                {copied === 'wa' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </>
                        )}
                        {botInfo?.verify_token && (
                          <>
                            <p>٥. Verify Token:</p>
                            <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                              <code className="text-emerald-400 text-[11px] flex-1">{botInfo.verify_token}</code>
                              <button onClick={() => copyText(botInfo.verify_token, 'vt')} className="text-white/30 hover:text-white">
                                {copied === 'vt' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      <input type="text" placeholder="Phone Number ID" value={waNumId} onChange={e => setWaNumId(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none font-mono" />
                      <input type="text" placeholder="Access Token" value={waToken} onChange={e => setWaToken(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none font-mono" />
                    </div>
                  )}

                  {/* Privacy tab */}
                  {settingsTab === 'privacy' && isFounder && (
                    <div className="space-y-3">
                      <p className="text-xs text-white/40">تنطبق على الموظفين بشكل افتراضي. صلاحيات فردية من تبويب الصلاحيات.</p>
                      <div className="glass p-4 rounded-2xl">
                        <div className="flex items-center gap-2 mb-3">
                          <Eye className="w-4 h-4 text-violet-400" />
                          <p className="text-sm font-semibold">ما يراه الموظفون</p>
                        </div>
                        <Toggle label="إظهار الأرصدة" desc="إيرادات ومصروفات الشهر" value={pShowBal}  onChange={setPShowBal} />
                        <Toggle label="إظهار نسبة الربح" desc="صافي الربح"             value={pShowProf} onChange={setPShowProf} />
                        <Toggle label="إظهار المبالغ"  desc="مبلغ كل معاملة"          value={pShowAmt}  onChange={setPShowAmt} />
                        <Toggle label="إظهار أسماء الجهات" desc="الموردون والعملاء"   value={pShowVen}  onChange={setPShowVen} />
                        <Toggle label="إظهار التقارير"  desc="الرسوم البيانية"         value={pShowRep}  onChange={setPShowRep} />
                      </div>
                      <div className="glass p-4 rounded-2xl">
                        <div className="flex items-center gap-2 mb-3">
                          <Lock className="w-4 h-4 text-blue-400" />
                          <p className="text-sm font-semibold">صلاحيات الإضافة</p>
                        </div>
                        <Toggle label="الموظفون يضيفون سجلات" desc="عبر البوت أو يدوياً" value={pEmpAdd} onChange={setPEmpAdd} />
                      </div>
                    </div>
                  )}

                  {/* Permissions tab */}
                  {settingsTab === 'permissions' && isFounder && (
                    <div className="space-y-4">
                      {/* Grant */}
                      <div className="glass p-4 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2">
                          <UserPlus className="w-4 h-4 text-blue-400" />
                          <p className="text-sm font-semibold">منح صلاحية لموظف</p>
                        </div>
                        <input type="number" placeholder="User ID للموظف" value={newUserId} onChange={e => setNewUserId(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-blue-500 focus:outline-none" />
                        <div className="grid grid-cols-3 gap-2">
                          {([['viewer','👁 مشاهد','يرى فقط'],['editor','✏️ محرر','يرى ويضيف'],['full','⚡ كامل','كل الصلاحيات']] as const).map(([k,l,d]) => (
                            <button key={k} onClick={() => setPreset(k)}
                              className={`p-2 rounded-xl border text-center transition-colors ${preset === k ? 'bg-blue-500/20 border-blue-500/50' : 'border-white/10'}`}>
                              <p className="text-xs font-semibold">{l}</p>
                              <p className="text-[10px] text-white/40 mt-0.5">{d}</p>
                            </button>
                          ))}
                        </div>
                        <button onClick={grantPerm} disabled={grantSaving || !newUserId.trim()}
                          className="w-full bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                          {grantSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} منح الصلاحية
                        </button>
                      </div>
                      {/* List */}
                      <div className="glass p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-white/40" />
                            <p className="text-sm font-semibold">الموظفون الحاليون</p>
                          </div>
                          <button onClick={loadPerms}><RefreshCw className={`w-3.5 h-3.5 text-white/30 ${permLoad ? 'animate-spin' : ''}`} /></button>
                        </div>
                        {permLoad ? (
                          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
                        ) : perms.length === 0 ? (
                          <p className="text-xs text-white/30 text-center py-4">لا يوجد موظفون بصلاحيات مخصصة</p>
                        ) : perms.map(p => (
                          <div key={p.user_id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                {p.name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{p.name || `#${p.user_id}`}</p>
                                <div className="flex gap-1 flex-wrap mt-0.5">
                                  {p.can_view_amounts && <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded-full">مبالغ</span>}
                                  {p.can_view_profits && <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded-full">أرباح</span>}
                                  {p.can_add_records  && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">إضافة</span>}
                                  {p.can_edit_records && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">تعديل</span>}
                                </div>
                              </div>
                            </div>
                            <button onClick={() => revokePerm(p.user_id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Save button (not on permissions tab) */}
                  {settingsTab !== 'permissions' && (
                    <button onClick={saveSetup} disabled={saving}
                      className="w-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />} حفظ الإعداد
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* FAB */}
        {activeTab !== 'settings' && (
          <button onClick={() => {
            setForm(f => ({ ...emptyForm(), record_type: activeTab === 'sales' ? 'income' : 'expense' }));
            setAddOpen(true);
          }}
            className="fixed bottom-6 left-6 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform z-30">
            <Plus className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      {/* ── Add Record Modal ── */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-lg glass-chrome rounded-t-2xl p-6 pb-10 space-y-4 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">إضافة سجل</h2>
              <button onClick={() => setAddOpen(false)} className="text-white/40 hover:text-white text-xl leading-none">✕</button>
            </div>

            {/* Type */}
            <div className="grid grid-cols-2 gap-2">
              {(['income','expense'] as const).map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, record_type: t, category: '' }))}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${form.record_type === t ? (t === 'income' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : 'glass text-white/60'}`}>
                  {t === 'income' ? '📈 إيراد / مبيعات' : '📉 مصروف / مشتريات'}
                </button>
              ))}
            </div>

            {/* Vendor */}
            <input type="text" placeholder="اسم الجهة / المورد / العميل (اختياري)" dir="rtl"
              value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:border-emerald-500 focus:outline-none" />

            {/* Amount + Currency */}
            <div className="flex gap-2">
              <input type="number" placeholder="المبلغ" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:border-emerald-500 focus:outline-none" />
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="w-[90px] bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-white text-sm focus:outline-none">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Category */}
            <div>
              <p className="text-xs text-white/40 mb-2">الفئة *</p>
              <div className="flex gap-2 flex-wrap">
                {(form.record_type === 'income' ? INCOME_CATS : EXPENSE_CATS).map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, category: c }))}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${form.category === c ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20 text-white/60'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment status */}
            <div>
              <p className="text-xs text-white/40 mb-2">حالة الدفع</p>
              <div className="grid grid-cols-3 gap-2">
                {(['paid','pending','partial'] as const).map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, payment_status: s }))}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${form.payment_status === s ? PAY_STATUS[s].cls + ' border-current' : 'border-white/10 text-white/50'}`}>
                    {PAY_STATUS[s].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <p className="text-xs text-white/40 mb-2">التاريخ</p>
              <input type="date" value={form.recorded_at} onChange={e => setForm(f => ({ ...f, recorded_at: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 focus:outline-none" />
            </div>

            {/* Description */}
            <textarea placeholder="الوصف (اختياري)" dir="rtl" rows={2} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:border-emerald-500 focus:outline-none resize-none" />

            {/* Invoice # */}
            <input type="text" placeholder="رقم الفاتورة (اختياري)" value={form.external_ref}
              onChange={e => setForm(f => ({ ...f, external_ref: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:border-emerald-500 focus:outline-none" />

            {/* Submit */}
            <button onClick={saveRecord} disabled={saving || !form.amount || !form.category}
              className="w-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} حفظ السجل
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
