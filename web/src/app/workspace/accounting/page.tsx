'use client';

/**
 * شكرة — AI Accountant Dashboard
 * --------------------------------
 * Privacy-first: invoice details stay in company's Google Sheets.
 * Supports Telegram Bot & WhatsApp Cloud API — company uses their own credentials.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, TrendingUp, TrendingDown, DollarSign, AlertCircle,
  ExternalLink, Plus, RefreshCw, Loader2, CheckCircle, Clock,
  BarChart3, Settings, Copy, Check, MessageCircle, Phone,
  Shield, Users, Trash2, UserPlus, Eye, EyeOff, Lock, Unlock,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getToken, isAuthenticated } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.alloul.app';

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
  };
  is_founder?: boolean;
};

type BotInfo = {
  service_email: string;
  webhook_telegram: string;
  webhook_whatsapp: string;
  verify_token: string;
  telegram_active: boolean;
  whatsapp_active: boolean;
};

type Permission = {
  user_id: number;
  name: string;
  username?: string;
  avatar?: string;
  can_view_dashboard: boolean;
  can_view_amounts: boolean;
  can_view_profits: boolean;
  can_view_reports: boolean;
  can_view_vendors: boolean;
  can_add_records: boolean;
  can_edit_records: boolean;
  can_delete_records: boolean;
  can_use_bot: boolean;
};

const ARABIC_MONTHS = ['','يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const INCOME_CATS  = ['مبيعات','خدمات','استثمارات','أخرى'];
const EXPENSE_CATS = ['رواتب','إيجار','مشتريات','مصاريف تشغيل','تسويق','أخرى'];

function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="flex-1 ml-3">
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-white/40 mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-emerald-500' : 'bg-white/20'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${value ? 'right-0.5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

export default function AccountingPage() {
  const router = useRouter();
  const [data,      setData]      = useState<DashboardData | null>(null);
  const [botInfo,   setBotInfo]   = useState<BotInfo | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [addOpen,   setAddOpen]   = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupTab,  setSetupTab]  = useState<'telegram'|'whatsapp'|'sheet'|'privacy'|'permissions'>('sheet');
  const [saving,    setSaving]    = useState(false);
  const [copied,    setCopied]    = useState<string|null>(null);

  const [recordForm, setRecordForm] = useState({ record_type: 'expense' as 'income'|'expense', amount: '', category: '', external_ref: '' });
  const [tgToken,    setTgToken]    = useState('');
  const [waNumId,    setWaNumId]    = useState('');
  const [waToken,    setWaToken]    = useState('');
  const [sheetUrl,   setSheetUrl]   = useState('');
  const [currency,   setCurrency]   = useState('SAR');

  // Privacy toggles
  const [privShowBalances,    setPrivShowBalances]    = useState(true);
  const [privShowProfits,     setPrivShowProfits]     = useState(true);
  const [privShowAmounts,     setPrivShowAmounts]     = useState(true);
  const [privShowVendors,     setPrivShowVendors]     = useState(true);
  const [privShowReports,     setPrivShowReports]     = useState(true);
  const [privEmployeesCanAdd, setPrivEmployeesCanAdd] = useState(true);

  // Permissions management
  const [permissions,    setPermissions]    = useState<Permission[]>([]);
  const [permLoading,    setPermLoading]    = useState(false);
  const [newUserId,      setNewUserId]      = useState('');
  const [grantPreset,    setGrantPreset]    = useState<'viewer'|'editor'|'full'>('viewer');
  const [grantSaving,    setGrantSaving]    = useState(false);

  useEffect(() => { if (!isAuthenticated()) router.replace('/login'); }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const h = token ? { Authorization: `Bearer ${token}` } : {};
      const [d1, d2] = await Promise.all([
        fetch(`${API_BASE}/accounting/dashboard`, { headers: h }).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/accounting/bot/info`,  { headers: h }).then(r => r.ok ? r.json() : null),
      ]);
      setData(d1);
      setBotInfo(d2);
      if (d1?.setup?.google_sheet_url) setSheetUrl(d1.setup.google_sheet_url);
      if (d1?.setup) {
        setPrivShowBalances(d1.setup.show_balances ?? true);
        setPrivShowProfits(d1.setup.show_profits ?? true);
        setPrivShowAmounts(d1.setup.show_amounts ?? true);
        setPrivShowVendors(d1.setup.show_vendors ?? true);
        setPrivShowReports(d1.setup.show_reports ?? true);
        setPrivEmployeesCanAdd(d1.setup.employees_can_add ?? true);
      }
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadPermissions = useCallback(async () => {
    setPermLoading(true);
    try {
      const token = getToken();
      const r = await fetch(`${API_BASE}/accounting/permissions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (r.ok) setPermissions(await r.json());
    } catch { /* empty */ }
    finally { setPermLoading(false); }
  }, []);

  useEffect(() => {
    if (setupOpen && setupTab === 'permissions') loadPermissions();
  }, [setupOpen, setupTab, loadPermissions]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const saveSetup = async () => {
    setSaving(true);
    try {
      const token = getToken();
      await fetch(`${API_BASE}/accounting/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          google_sheet_url:           sheetUrl || null,
          telegram_bot_token:         tgToken  || null,
          whatsapp_phone_number_id:   waNumId  || null,
          whatsapp_access_token:      waToken  || null,
          currency,
          show_balances:    privShowBalances,
          show_profits:     privShowProfits,
          show_amounts:     privShowAmounts,
          show_vendors:     privShowVendors,
          show_reports:     privShowReports,
          employees_can_add: privEmployeesCanAdd,
        }),
      });
      setSetupOpen(false);
      load();
    } catch { alert('تعذر الحفظ.'); }
    finally { setSaving(false); }
  };

  const grantPermission = async () => {
    if (!newUserId.trim()) return;
    setGrantSaving(true);
    const presets = {
      viewer: { can_view_dashboard: true, can_view_amounts: false, can_view_profits: false, can_view_reports: false, can_view_vendors: false, can_add_records: false, can_edit_records: false, can_delete_records: false, can_use_bot: false },
      editor: { can_view_dashboard: true, can_view_amounts: true,  can_view_profits: false, can_view_reports: false, can_view_vendors: true,  can_add_records: true,  can_edit_records: false, can_delete_records: false, can_use_bot: true  },
      full:   { can_view_dashboard: true, can_view_amounts: true,  can_view_profits: true,  can_view_reports: true,  can_view_vendors: true,  can_add_records: true,  can_edit_records: true,  can_delete_records: false, can_use_bot: true  },
    };
    try {
      const token = getToken();
      const r = await fetch(`${API_BASE}/accounting/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ user_id: parseInt(newUserId), ...presets[grantPreset] }),
      });
      if (r.ok) { setNewUserId(''); loadPermissions(); }
      else { const e = await r.json(); alert(e.detail || 'تعذر الإضافة'); }
    } catch { alert('تعذر الإضافة.'); }
    finally { setGrantSaving(false); }
  };

  const revokePermission = async (userId: number) => {
    if (!confirm('هل تريد إلغاء صلاحيات هذا الموظف؟')) return;
    try {
      const token = getToken();
      await fetch(`${API_BASE}/accounting/permissions/${userId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      loadPermissions();
    } catch { alert('تعذر الحذف.'); }
  };

  const saveRecord = async () => {
    if (!recordForm.amount || !recordForm.category) return;
    setSaving(true);
    try {
      const token = getToken();
      await fetch(`${API_BASE}/accounting/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ...recordForm, amount: parseFloat(recordForm.amount), source: 'manual', recorded_at: new Date().toISOString() }),
      });
      setAddOpen(false);
      setRecordForm({ record_type: 'expense', amount: '', category: '', external_ref: '' });
      load();
    } catch { alert('تعذر الحفظ.'); }
    finally { setSaving(false); }
  };

  const fmt = (n: number) => {
    try { return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: data?.setup.currency || 'SAR', maximumFractionDigits: 0 }).format(n); }
    catch { return n.toFixed(0); }
  };

  const maxTrend = data ? Math.max(...data.trend.map(t => Math.max(t.income, t.expense)), 1) : 1;
  const now = new Date();
  const isFounder = data?.is_founder ?? false;

  return (
    <AppShell>
      <div className="min-h-screen flex flex-col">

        {/* Header */}
        <div className="glass-chrome sticky top-0 z-20 px-4 py-3 flex items-center gap-3">
          <Link href="/workspace" className="p-2 rounded-full hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">ش</div>
          <div className="flex-1">
            <h1 className="text-base font-bold">شكرة — المحاسب الذكي</h1>
            <p className="text-xs text-white/60">بياناتك تبقى في Google Sheet الخاص بك</p>
          </div>
          <button onClick={() => setSetupOpen(true)} className="p-2 rounded-full hover:bg-white/5 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <button onClick={load} className="p-2 rounded-full hover:bg-white/5 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 max-w-3xl mx-auto w-full">

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
          ) : (
            <>
              {/* Bot Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`glass p-3 flex items-center gap-2 ${botInfo?.telegram_active ? 'border border-emerald-500/30' : 'border border-white/5'}`}>
                  <MessageCircle className={`w-4 h-4 ${botInfo?.telegram_active ? 'text-emerald-400' : 'text-white/30'}`} />
                  <div>
                    <p className="text-xs font-semibold">Telegram Bot</p>
                    <p className={`text-[10px] ${botInfo?.telegram_active ? 'text-emerald-400' : 'text-white/40'}`}>
                      {botInfo?.telegram_active ? 'مفعّل ✓' : 'غير مفعّل'}
                    </p>
                  </div>
                </div>
                <div className={`glass p-3 flex items-center gap-2 ${botInfo?.whatsapp_active ? 'border border-emerald-500/30' : 'border border-white/5'}`}>
                  <Phone className={`w-4 h-4 ${botInfo?.whatsapp_active ? 'text-emerald-400' : 'text-white/30'}`} />
                  <div>
                    <p className="text-xs font-semibold">WhatsApp Business</p>
                    <p className={`text-[10px] ${botInfo?.whatsapp_active ? 'text-emerald-400' : 'text-white/40'}`}>
                      {botInfo?.whatsapp_active ? 'مفعّل ✓' : 'غير مفعّل'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Setup Banner */}
              {!botInfo?.telegram_active && !botInfo?.whatsapp_active && (
                <button onClick={() => setSetupOpen(true)} className="w-full glass border border-amber-500/30 p-4 flex items-start gap-3 text-right">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-300">فعّل استقبال الفواتير</p>
                    <p className="text-xs text-white/60 mt-1">ربط Telegram Bot أو WhatsApp Business لاستقبال الفواتير تلقائياً</p>
                  </div>
                </button>
              )}

              {/* Period */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm text-white/50">{ARABIC_MONTHS[now.getMonth() + 1]} {now.getFullYear()}</h2>
                {data?.setup.google_sheet_url && (
                  <a href={data.setup.google_sheet_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-emerald-400 hover:underline">
                    <ExternalLink className="w-3 h-3" /> Google Sheet
                  </a>
                )}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'الإيرادات',       value: fmt(data?.summary.total_income ?? 0),  icon: TrendingUp,   color: 'text-emerald-400' },
                  { label: 'المصروفات',        value: fmt(data?.summary.total_expense ?? 0), icon: TrendingDown, color: 'text-red-400' },
                  { label: 'صافي الربح',       value: fmt(data?.summary.net_profit ?? 0),    icon: DollarSign,   color: (data?.summary.net_profit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'بانتظار مراجعة',   value: String(data?.summary.pending_review ?? 0), icon: Clock, color: 'text-amber-400' },
                ].map(item => (
                  <div key={item.label} className="glass p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-xs text-white/60">{item.label}</span>
                    </div>
                    <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Trend */}
              {data && data.trend.length > 0 && (
                <div className="glass p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-primary-400" />
                    <h3 className="text-sm font-semibold">الاتجاه — آخر 6 أشهر</h3>
                  </div>
                  <div className="flex items-end gap-2 h-28">
                    {data.trend.map((t, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex gap-0.5 items-end h-20">
                          <div className="flex-1 bg-emerald-500/60 rounded-t" style={{ height: `${(t.income / maxTrend) * 100}%` }} />
                          <div className="flex-1 bg-red-500/60 rounded-t"     style={{ height: `${(t.expense / maxTrend) * 100}%` }} />
                        </div>
                        <span className="text-[9px] text-white/40">{ARABIC_MONTHS[t.month]?.slice(0, 3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Breakdown */}
              {data && data.breakdown.length > 0 && (
                <div className="glass p-5">
                  <h3 className="text-sm font-semibold mb-4">التفاصيل حسب الفئة</h3>
                  {data.breakdown.map((b, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${b.type === 'income' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        <span className="text-sm">{b.category}</span>
                        <span className="text-xs text-white/40">({b.count})</span>
                      </div>
                      <span className={`text-sm font-semibold ${b.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(b.total)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Founder shortcuts */}
              {isFounder && (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setSetupTab('privacy'); setSetupOpen(true); }} className="glass p-4 flex items-center gap-3 text-right hover:border-emerald-500/30 border border-white/5 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">الخصوصية</p>
                      <p className="text-xs text-white/40">تحكم بما يُرى</p>
                    </div>
                  </button>
                  <button onClick={() => { setSetupTab('permissions'); setSetupOpen(true); }} className="glass p-4 flex items-center gap-3 text-right hover:border-emerald-500/30 border border-white/5 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">الصلاحيات</p>
                      <p className="text-xs text-white/40">إدارة الموظفين</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Privacy note */}
              <div className="glass-subtle p-4 flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-white/50">تفاصيل الفواتير (أسماء الموردين، المبالغ التفصيلية) مخزّنة في Google Sheet الخاص بك فقط — ALLOUL لا يراها.</p>
              </div>
            </>
          )}
        </div>

        {/* FAB */}
        <button onClick={() => setAddOpen(true)} className="fixed bottom-6 left-6 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform z-30">
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* ── Add Record Modal ── */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-lg glass-chrome rounded-t-2xl p-6 pb-10 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold">إضافة سجل يدوي</h2>
            <div className="grid grid-cols-2 gap-2">
              {(['income','expense'] as const).map(t => (
                <button key={t} onClick={() => setRecordForm(f => ({ ...f, record_type: t, category: '' }))}
                  className={`py-2 rounded-lg text-sm font-semibold transition-colors ${recordForm.record_type === t ? (t === 'income' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : 'glass'}`}>
                  {t === 'income' ? 'إيراد' : 'مصروف'}
                </button>
              ))}
            </div>
            <input type="number" placeholder="المبلغ" value={recordForm.amount} onChange={e => setRecordForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:border-primary-500 focus:outline-none" />
            <div className="flex gap-2 flex-wrap">
              {(recordForm.record_type === 'income' ? INCOME_CATS : EXPENSE_CATS).map(c => (
                <button key={c} onClick={() => setRecordForm(f => ({ ...f, category: c }))}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${recordForm.category === c ? 'bg-primary-500 border-primary-500 text-white' : 'border-white/20'}`}>{c}</button>
              ))}
            </div>
            <button onClick={saveRecord} disabled={saving || !recordForm.amount || !recordForm.category}
              className="w-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} حفظ السجل
            </button>
          </div>
        </div>
      )}

      {/* ── Setup Modal ── */}
      {setupOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={() => setSetupOpen(false)}>
          <div className="w-full max-w-lg glass-chrome rounded-t-2xl p-6 pb-10 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold mb-4">إعداد شكرة</h2>

            {/* Tabs */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-5 overflow-x-auto">
              {([
                ['sheet',       '📊 شيت'],
                ['telegram',    '✈️ تلغرام'],
                ['whatsapp',    '📱 واتساب'],
                ...(isFounder ? [['privacy', '🔒 خصوصية'], ['permissions', '👥 صلاحيات']] as const : []),
              ] as [string, string][]).map(([k, label]) => (
                <button key={k} onClick={() => setSetupTab(k as typeof setupTab)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${setupTab === k ? 'bg-emerald-500 text-white' : 'text-white/60'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── Sheet Tab ── */}
            {setupTab === 'sheet' && (
              <div className="space-y-4">
                <div className="glass p-4 rounded-xl space-y-2 text-xs text-white/70">
                  <p className="font-semibold text-white">خطوات ربط Google Sheet:</p>
                  <p>١. افتح <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">sheets.google.com</a> وأنشئ ملفاً جديداً</p>
                  <p>٢. اضغط <strong>Share</strong> وأضف هذا الإيميل كـ Editor:</p>
                  <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2 mt-1">
                    <code className="text-emerald-400 text-[11px] flex-1 break-all">{botInfo?.service_email || 'shukra@alloul-ai.iam.gserviceaccount.com'}</code>
                    <button onClick={() => copyToClipboard(botInfo?.service_email || 'shukra@alloul-ai.iam.gserviceaccount.com', 'email')} className="text-white/40 hover:text-white">
                      {copied === 'email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <p>٣. الصق رابط الشيت أدناه</p>
                </div>
                <input type="url" placeholder="https://docs.google.com/spreadsheets/d/..." value={sheetUrl} onChange={e => setSheetUrl(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none" />
                <select value={currency} onChange={e => setCurrency(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none">
                  {['SAR','AED','KWD','BHD','OMR','QAR','JOD','EGP','USD','EUR','GBP'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {/* ── Telegram Tab ── */}
            {setupTab === 'telegram' && (
              <div className="space-y-4">
                <div className="glass p-4 rounded-xl space-y-2 text-xs text-white/70">
                  <p className="font-semibold text-white">خطوات ربط Telegram Bot (دقيقتان):</p>
                  <p>١. افتح Telegram وابحث عن <strong className="text-white">@BotFather</strong></p>
                  <p>٢. أرسل <code className="bg-white/10 px-1 rounded">/newbot</code></p>
                  <p>٣. اختر اسماً للبوت مثل: <em>فواتير شركتي</em></p>
                  <p>٤. انسخ الـ Token الذي يرسله BotFather والصقه أدناه</p>
                  <p className="text-emerald-400">✅ ALLOUL سيضبط الـ Webhook تلقائياً</p>
                </div>
                <input type="text" placeholder="1234567890:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={tgToken} onChange={e => setTgToken(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none font-mono" />
                {botInfo?.webhook_telegram && (
                  <div className="glass-subtle p-3 rounded-lg">
                    <p className="text-xs text-white/50 mb-1">Webhook URL (يُضبط تلقائياً)</p>
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] text-white/70 flex-1 break-all">{botInfo.webhook_telegram}</code>
                      <button onClick={() => copyToClipboard(botInfo.webhook_telegram, 'tg')} className="text-white/40 hover:text-white flex-shrink-0">
                        {copied === 'tg' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── WhatsApp Tab ── */}
            {setupTab === 'whatsapp' && (
              <div className="space-y-4">
                <div className="glass p-4 rounded-xl space-y-2 text-xs text-white/70">
                  <p className="font-semibold text-white">خطوات ربط WhatsApp Business API:</p>
                  <p>١. افتح <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">Meta Developers</a> وأنشئ تطبيقاً</p>
                  <p>٢. أضف منتج <strong>WhatsApp</strong> للتطبيق</p>
                  <p>٣. من لوحة WhatsApp احصل على:</p>
                  <p className="pr-3">• <strong>Phone Number ID</strong></p>
                  <p className="pr-3">• <strong>Permanent Access Token</strong></p>
                  <p>٤. في إعدادات Webhook أدخل هذا الرابط:</p>
                  {botInfo?.webhook_whatsapp && (
                    <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                      <code className="text-emerald-400 text-[10px] flex-1 break-all">{botInfo.webhook_whatsapp}</code>
                      <button onClick={() => copyToClipboard(botInfo.webhook_whatsapp, 'wa')} className="text-white/40 hover:text-white flex-shrink-0">
                        {copied === 'wa' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                  {botInfo?.verify_token && (
                    <>
                      <p>٥. Verify Token:</p>
                      <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                        <code className="text-emerald-400 text-[11px] flex-1 break-all">{botInfo.verify_token}</code>
                        <button onClick={() => copyToClipboard(botInfo.verify_token, 'vt')} className="text-white/40 hover:text-white flex-shrink-0">
                          {copied === 'vt' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <input type="text" placeholder="Phone Number ID" value={waNumId} onChange={e => setWaNumId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none font-mono" />
                <input type="text" placeholder="Access Token" value={waToken} onChange={e => setWaToken(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none font-mono" />
              </div>
            )}

            {/* ── Privacy Tab ── */}
            {setupTab === 'privacy' && (
              <div className="space-y-2">
                <p className="text-xs text-white/50 mb-3">هذه الإعدادات تنطبق على جميع الموظفين بشكل افتراضي. يمكنك منح أذونات خاصة لأفراد معينين من تبويب "الصلاحيات".</p>

                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-4 h-4 text-violet-400" />
                    <p className="text-sm font-semibold">ما يراه الموظفون</p>
                  </div>
                  <Toggle label="إظهار الأرصدة" desc="إيرادات ومصروفات الشهر" value={privShowBalances} onChange={setPrivShowBalances} />
                  <Toggle label="إظهار نسبة الربح" desc="صافي الربح والهامش" value={privShowProfits} onChange={setPrivShowProfits} />
                  <Toggle label="إظهار المبالغ التفصيلية" desc="مبلغ كل معاملة" value={privShowAmounts} onChange={setPrivShowAmounts} />
                  <Toggle label="إظهار أسماء الموردين" desc="الجهة في كل معاملة" value={privShowVendors} onChange={setPrivShowVendors} />
                  <Toggle label="إظهار التقارير" desc="الرسوم البيانية والملخصات" value={privShowReports} onChange={setPrivShowReports} />
                </div>

                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Unlock className="w-4 h-4 text-blue-400" />
                    <p className="text-sm font-semibold">صلاحيات الإضافة</p>
                  </div>
                  <Toggle label="الموظفون يمكنهم إضافة سجلات" desc="عبر البوت أو يدوياً" value={privEmployeesCanAdd} onChange={setPrivEmployeesCanAdd} />
                </div>

                <div className="glass-subtle p-3 rounded-xl flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-white/40">المؤسس دائماً يرى كل شيء بغض النظر عن هذه الإعدادات.</p>
                </div>
              </div>
            )}

            {/* ── Permissions Tab ── */}
            {setupTab === 'permissions' && (
              <div className="space-y-4">
                <p className="text-xs text-white/50">امنح موظفاً معيناً صلاحيات مخصصة بغض النظر عن الإعدادات العامة.</p>

                {/* Grant section */}
                <div className="glass p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-blue-400" />
                    <p className="text-sm font-semibold">منح صلاحية</p>
                  </div>
                  <input
                    type="number"
                    placeholder="User ID للموظف"
                    value={newUserId}
                    onChange={e => setNewUserId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-blue-500 focus:outline-none"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['viewer', '👁 مشاهد',   'يرى اللوحة فقط'],
                      ['editor', '✏️ محرر',    'يرى ويضيف'],
                      ['full',   '⚡ كامل',   'كل الصلاحيات'],
                    ] as const).map(([k, label, desc]) => (
                      <button key={k} onClick={() => setGrantPreset(k as typeof grantPreset)}
                        className={`p-2 rounded-lg border text-center transition-colors ${grantPreset === k ? 'bg-blue-500/20 border-blue-500/50' : 'border-white/10'}`}>
                        <p className="text-xs font-semibold">{label}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">{desc}</p>
                      </button>
                    ))}
                  </div>
                  <button onClick={grantPermission} disabled={grantSaving || !newUserId.trim()}
                    className="w-full bg-blue-500 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                    {grantSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} منح الصلاحية
                  </button>
                </div>

                {/* Existing permissions */}
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-white/60" />
                      <p className="text-sm font-semibold">الموظفون الحاليون</p>
                    </div>
                    <button onClick={loadPermissions} className="text-white/40 hover:text-white">
                      <RefreshCw className={`w-3.5 h-3.5 ${permLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {permLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-white/40" /></div>
                  ) : permissions.length === 0 ? (
                    <p className="text-xs text-white/30 text-center py-4">لا يوجد موظفون بصلاحيات مخصصة</p>
                  ) : (
                    <div className="space-y-2">
                      {permissions.map(p => (
                        <div key={p.user_id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {p.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{p.name || `User #${p.user_id}`}</p>
                              <div className="flex gap-1 mt-0.5 flex-wrap">
                                {p.can_view_amounts   && <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded-full">مبالغ</span>}
                                {p.can_view_profits   && <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded-full">أرباح</span>}
                                {p.can_view_reports   && <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded-full">تقارير</span>}
                                {p.can_add_records    && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">إضافة</span>}
                                {p.can_edit_records   && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">تعديل</span>}
                                {p.can_delete_records && <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">حذف</span>}
                              </div>
                            </div>
                          </div>
                          <button onClick={() => revokePermission(p.user_id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save button (not shown on permissions tab) */}
            {setupTab !== 'permissions' && (
              <button onClick={saveSetup} disabled={saving}
                className="w-full mt-5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} حفظ الإعداد
              </button>
            )}
            <button onClick={() => setSetupOpen(false)} className="w-full mt-2 text-center text-sm text-white/40 py-2">إلغاء</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
