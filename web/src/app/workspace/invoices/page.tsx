'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Plus, Loader2, CheckCircle, Clock } from 'lucide-react';
import AppShell from '@/components/AppShell';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.alloul.app';
import { getToken } from '@/lib/auth';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  amount: number;
  currency: 'SAR' | 'AED' | 'USD';
  vat_rate: number;
  status: 'draft' | 'sent' | 'paid';
  created_at: string;
  zatca_compliant?: boolean;
}

const VAT_PRESETS = [
  { label: 'السعودية 15%', rate: 15, currency: 'SAR' as const },
  { label: 'الإمارات 5%', rate: 5, currency: 'AED' as const },
  { label: 'بدون ضريبة', rate: 0, currency: 'USD' as const },
];

const STATUS_MAP = {
  draft: { label: 'مسودة', color: '#9CA3AF' },
  sent: { label: 'مُرسلة', color: '#F59E0B' },
  paid: { label: 'مدفوعة', color: '#10B981' },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ client_name: string; amount: string; currency: 'SAR' | 'AED' | 'USD'; vat_rate: number }>({ client_name: '', amount: '', currency: 'SAR', vat_rate: 15 });

  useEffect(() => {
    const token = getToken();
    fetch(`${API_BASE}/invoices`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { invoices: [] })
      .then(d => setInvoices(d.invoices ?? []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  const createInvoice = async () => {
    if (!form.client_name || !form.amount) return;
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(prev => [data, ...prev]);
        setShowForm(false);
        setForm({ client_name: '', amount: '', currency: 'SAR', vat_rate: 15 });
      }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const total = (inv: Invoice) => inv.amount * (1 + inv.vat_rate / 100);

  return (
    <AppShell>
      <div className="p-4 max-w-3xl mx-auto" dir="rtl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#06B6D420' }}>
              <FileText size={22} style={{ color: '#06B6D4' }} />
            </div>
            <div>
              <h1 className="text-white font-black text-xl">الفواتير</h1>
              <p className="text-gray-400 text-sm">ZATCA / ضريبة القيمة المضافة</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors"
            style={{ background: '#06B6D4' }}
          >
            <Plus size={16} />
            فاتورة جديدة
          </button>
        </div>

        {/* create form */}
        {showForm && (
          <div className="bg-dark-bg-800 border border-cyan-500/30 rounded-2xl p-4 mb-6 space-y-3">
            <p className="text-white font-semibold text-sm">إنشاء فاتورة</p>
            <input
              value={form.client_name}
              onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
              placeholder="اسم العميل"
              className="w-full bg-dark-bg-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none"
            />
            <input
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="المبلغ"
              className="w-full bg-dark-bg-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none"
            />
            <div className="flex gap-2">
              {VAT_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => setForm(f => ({ ...f, vat_rate: p.rate, currency: p.currency }))}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-colors border"
                  style={{
                    background: form.vat_rate === p.rate ? '#06B6D420' : 'transparent',
                    borderColor: form.vat_rate === p.rate ? '#06B6D4' : 'rgba(255,255,255,0.1)',
                    color: form.vat_rate === p.rate ? '#06B6D4' : '#9CA3AF',
                  } as React.CSSProperties}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {form.amount && (
              <p className="text-gray-400 text-xs">
                الإجمالي شاملاً الضريبة:{' '}
                <span className="text-white font-bold">
                  {(parseFloat(form.amount || '0') * (1 + form.vat_rate / 100)).toFixed(2)} {form.currency}
                </span>
              </p>
            )}
            <button
              onClick={createInvoice}
              disabled={!form.client_name || !form.amount || saving}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
              style={{ background: '#06B6D4' }}
            >
              {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'إنشاء الفاتورة'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-gray-500" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <FileText size={48} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد فواتير بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map(inv => (
              <div key={inv.id} className="bg-dark-bg-800 border border-white/8 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-semibold text-sm">{inv.client_name}</p>
                    <p className="text-gray-500 text-xs">{inv.invoice_number}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-white font-bold">{total(inv).toFixed(2)} {inv.currency}</p>
                    <p className="text-gray-500 text-xs">ضريبة {inv.vat_rate}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${STATUS_MAP[inv.status].color}20`, color: STATUS_MAP[inv.status].color }}>
                    {STATUS_MAP[inv.status].label}
                  </span>
                  {inv.zatca_compliant && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                      <CheckCircle size={10} />
                      ZATCA
                    </span>
                  )}
                  <span className="text-gray-600 text-xs mr-auto">{new Date(inv.created_at).toLocaleDateString('ar')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
