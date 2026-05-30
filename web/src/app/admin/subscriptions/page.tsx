'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, DollarSign, Users, Activity,
  CheckCircle, Clock, XCircle, Loader2, Building2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';

interface AdminStats {
  total_users: number;
  verified_users: number;
  total_posts: number;
  total_companies: number;
  active_subscriptions: number;
  trialing_subscriptions: number;
  canceled_subscriptions: number;
}

interface CompanySub {
  id: number;
  name: string;
  founder_email?: string;
  plan_id?: string;
  status?: string;
  created_at?: string;
  member_count: number;
}

const PLAN_LABEL: Record<string, string> = {
  'price_1TPS2BGPIIEnFHbUv19A4YVu': 'Starter',
  'price_1TPS2QGPIIEnFHbUifufCcWZ': 'Professional',
  'price_1TCmhyGPIIEnFHbUxri6Zbcw': 'Starter',
  'price_1TCmiqGPIIEnFHbUahgCLsew': 'Professional',
  'price_1TCmjpGPIIEnFHbUSeG8GkZK': 'Business',
};

const STATUS_STYLE: Record<string, string> = {
  active:    'bg-green-900 text-green-200',
  trialing:  'bg-yellow-900 text-yellow-200',
  canceled:  'bg-red-900 text-red-200',
  free:      'bg-slate-700 text-slate-300',
};

const STATUS_LABEL: Record<string, string> = {
  active:   'نشط',
  trialing: 'تجريبي',
  canceled: 'ملغى',
  free:     'مجاني',
};

export default function SubscriptionsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [companies, setCompanies] = useState<CompanySub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    (async () => {
      try {
        const [s, c] = await Promise.all([
          apiFetch<AdminStats>('/admin/stats'),
          apiFetch<CompanySub[]>('/admin/companies'),
        ]);
        setStats(s);
        setCompanies(c);
      } catch (e: any) {
        setError(e?.message || 'غير مصرح');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 size={32} className="text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-red-400 text-lg">
        {error === 'Forbidden' ? '⛔ غير مصرح — هذه الصفحة للمشرفين فقط' : error}
      </div>
    );
  }

  const kpis = [
    { label: 'إجمالي المستخدمين',  value: stats?.total_users ?? 0,           icon: Users,      color: 'text-blue-400' },
    { label: 'إجمالي الشركات',     value: stats?.total_companies ?? 0,        icon: Building2,  color: 'text-purple-400' },
    { label: 'اشتراكات نشطة',      value: stats?.active_subscriptions ?? 0,   icon: CheckCircle,color: 'text-green-400' },
    { label: 'اشتراكات تجريبية',   value: stats?.trialing_subscriptions ?? 0, icon: Clock,      color: 'text-yellow-400' },
    { label: 'اشتراكات ملغاة',     value: stats?.canceled_subscriptions ?? 0, icon: XCircle,    color: 'text-red-400' },
    { label: 'موظفون مُوثَّقون',   value: stats?.verified_users ?? 0,         icon: Activity,   color: 'text-cyan-400' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">لوحة الإدارة</h1>
          <p className="text-slate-400">بيانات حقيقية من قاعدة البيانات</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          {kpis.map((k) => (
            <div key={k.label} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <k.icon size={20} className={`${k.color} mb-3`} />
              <p className="text-3xl font-bold">{k.value}</p>
              <p className="text-slate-400 text-xs mt-1">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Subscription breakdown */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Active',   val: stats?.active_subscriptions ?? 0,   pct: stats ? Math.round((stats.active_subscriptions / Math.max(stats.total_companies, 1)) * 100) : 0, color: 'bg-green-500' },
            { label: 'Trialing', val: stats?.trialing_subscriptions ?? 0,  pct: stats ? Math.round((stats.trialing_subscriptions / Math.max(stats.total_companies, 1)) * 100) : 0, color: 'bg-yellow-500' },
            { label: 'Canceled', val: stats?.canceled_subscriptions ?? 0,  pct: stats ? Math.round((stats.canceled_subscriptions / Math.max(stats.total_companies, 1)) * 100) : 0, color: 'bg-red-500' },
          ].map((p) => (
            <div key={p.label} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">{p.label}</span>
                <span className="text-sm text-slate-400">{p.val} ({p.pct}%)</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                <div className={`${p.color} h-full rounded-full`} style={{ width: `${p.pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Companies table */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-6">الشركات ({companies.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 text-right">
                  {['الشركة', 'المؤسس', 'الخطة', 'الحالة', 'الأعضاء', 'تاريخ الإنشاء'].map((h) => (
                    <th key={h} className="py-3 px-4 text-sm font-semibold text-slate-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-3 px-4 text-sm font-medium">{c.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-400">{c.founder_email || '—'}</td>
                    <td className="py-3 px-4 text-sm">{c.plan_id ? (PLAN_LABEL[c.plan_id] || c.plan_id.slice(-6)) : '—'}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[c.status || 'free'] || 'bg-slate-700 text-slate-300'}`}>
                        {STATUS_LABEL[c.status || 'free'] || c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{c.member_count}</td>
                    <td className="py-3 px-4 text-sm text-slate-400">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('ar') : '—'}
                    </td>
                  </tr>
                ))}
                {companies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">لا توجد شركات بعد</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
