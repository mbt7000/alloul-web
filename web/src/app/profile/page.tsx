'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Settings, Building2, Shield, Key, LogOut,
  Loader2, Mail, Calendar, BadgeCheck, ChevronLeft,
  BarChart3, Users, Briefcase, Bell, Globe, Moon,
  Edit3, MapPin, Phone, X, Check, Camera, Lock,
  Info, FileText, HelpCircle, Star, Sparkles,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getCurrentUser, getDashboardStats, apiFetch, type DashboardStats } from '@/lib/api-client';
import { isAuthenticated, clearToken, type AuthUser } from '@/lib/auth';

const MENU_SECTIONS = [
  {
    title: 'الشركة والفريق',
    items: [
      { icon: Building2, label: 'ملف الشركة',       sub: 'الهوية والبيانات',        href: '/workspace',           color: '#00D4FF' },
      { icon: Users,     label: 'الفريق',             sub: 'الموظفون والأدوار',       href: '/workspace/team',      color: '#8B5CF6' },
      { icon: Briefcase, label: 'الوظائف',            sub: 'نشر وإدارة الوظائف',     href: '/workspace/hiring',    color: '#6366F1' },
      { icon: BarChart3, label: 'التقارير',           sub: 'الأداء والإحصائيات',      href: '/workspace/reports',   color: '#14E0A4' },
    ],
  },
  {
    title: 'الإعدادات',
    items: [
      { icon: Bell,      label: 'الإشعارات',          sub: 'تنبيهات ومعاينة',         href: null,                   color: '#FFB24D', badge: '3' },
      { icon: Globe,     label: 'اللغة والمنطقة',     sub: 'العربية — GMT+3',         href: null,                   color: '#2E8BFF' },
      { icon: Moon,      label: 'المظهر',              sub: 'الوضع الداكن',            href: null,                   color: '#A78BFA' },
      { icon: Key,       label: 'الأدوار والصلاحيات',  sub: 'إدارة الوصول',           href: '/workspace/services',  color: '#FFB24D' },
    ],
  },
  {
    title: 'الأمان',
    items: [
      { icon: Lock,      label: 'كلمة المرور',         sub: 'تغيير كلمة المرور',      href: '/settings/billing',    color: '#EF4444' },
      { icon: Shield,    label: 'الأمان والخصوصية',    sub: '2FA وسجل الجلسات',       href: '/settings/billing',    color: '#F97316' },
    ],
  },
  {
    title: 'عن التطبيق',
    items: [
      { icon: Star,      label: 'قيّم التطبيق',        sub: 'شاركنا رأيك',            href: null,                   color: '#FBBF24' },
      { icon: HelpCircle,label: 'المساعدة',             sub: 'أسئلة شائعة ودعم',      href: null,                   color: '#60A5FA' },
      { icon: FileText,  label: 'الشروط والسياسة',     sub: 'قراءة سياسة الخصوصية',  href: null,                   color: '#94A3B8' },
      { icon: Info,      label: 'الإصدار',              sub: 'v2.0 — ALLOUL Agent',   href: null,                   color: '#64748B' },
    ],
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    let mounted = true;
    (async () => {
      try {
        const [me, s] = await Promise.all([
          getCurrentUser(),
          getDashboardStats().catch(() => null),
        ]);
        if (mounted) {
          setUser(me);
          setStats(s);
          setEditName(me.name || '');
          setEditBio((me as any).bio || '');
          setEditLocation((me as any).location || '');
        }
      } catch {
        router.replace('/login');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  const openEdit = () => {
    setSaveError(null);
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await apiFetch<AuthUser>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName || undefined,
          bio: editBio || undefined,
          location: editLocation || undefined,
        }),
      });
      setUser(updated);
      setEditOpen(false);
    } catch (e: any) {
      setSaveError(e?.message || 'خطأ في الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 size={24} className="text-primary animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!user) return null;

  const initials = (user.name || user.username || 'U').slice(0, 2).toUpperCase();

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 glass-chrome px-4 py-3 flex items-center gap-3">
        <h1 className="text-white font-black text-lg flex-1">الملف الشخصي</h1>
        <button
          onClick={openEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-white/70 text-xs font-bold hover:bg-white/5 transition-colors"
        >
          <Edit3 size={13} />
          تعديل
        </button>
      </header>

      <div className="px-4 py-5 space-y-5 pb-24 md:pb-10">

        {/* ─── Hero Profile Card ─────────────────────────────────────────── */}
        <div
          className="rounded-3xl overflow-hidden border border-white/10"
          style={{
            background: 'linear-gradient(160deg, rgba(46,139,255,0.12) 0%, rgba(0,212,255,0.06) 40%, rgba(20,224,164,0.05) 100%)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}
        >
          {/* Gradient band */}
          <div className="h-24 relative overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, rgba(46,139,255,0.35) 0%, rgba(0,212,255,0.25) 50%, rgba(20,224,164,0.15) 100%)',
              }}
            />
            <div
              className="absolute top-[-40px] right-[-40px] w-48 h-48 rounded-full opacity-30"
              style={{ background: 'radial-gradient(circle, #00D4FF44, transparent 70%)' }}
            />
          </div>

          <div className="px-5 pb-5">
            {/* Avatar row */}
            <div className="flex items-end justify-between -mt-12 mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl border-4 border-dark-bg-900 overflow-hidden shadow-glow-primary">
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #2E8BFF, #00D4FF)' }}>
                      <span className="text-white font-black text-3xl">{initials}</span>
                    </div>
                  )}
                </div>
                <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary-500 border-2 border-dark-bg-900 flex items-center justify-center hover:bg-primary-400">
                  <Camera size={12} className="text-white" />
                </button>
              </div>

              {/* Plan badge */}
              <div className="mb-1 px-3 py-1.5 rounded-xl border border-accent-500/30 bg-accent-500/10 flex items-center gap-1.5">
                <Sparkles size={11} className="text-accent-400" />
                <span className="text-accent-400 text-xs font-bold">Pro Trial</span>
              </div>
            </div>

            {/* Name */}
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-white font-black text-2xl">{user.name || user.username}</h2>
              {(user as any).verified && (
                <BadgeCheck size={20} className="text-accent flex-shrink-0" />
              )}
            </div>
            <p className="text-white/50 text-sm mb-3">@{user.username}</p>

            {/* Bio */}
            {(user as any).bio && (
              <p className="text-white/70 text-sm mb-3 leading-relaxed">{(user as any).bio}</p>
            )}

            {/* Meta chips */}
            <div className="flex flex-wrap gap-2">
              {user.email && (
                <span className="flex items-center gap-1.5 text-xs text-white/50 bg-white/5 px-2.5 py-1 rounded-lg">
                  <Mail size={11} /> {user.email}
                </span>
              )}
              {(user as any).location && (
                <span className="flex items-center gap-1.5 text-xs text-white/50 bg-white/5 px-2.5 py-1 rounded-lg">
                  <MapPin size={11} /> {(user as any).location}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs text-white/50 bg-white/5 px-2.5 py-1 rounded-lg">
                <Calendar size={11} /> منذ 2026
              </span>
            </div>
          </div>
        </div>

        {/* ─── Stats Strip ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'أعضاء الفريق', value: stats?.team_size ?? 0,          color: '#00D4FF', bg: 'rgba(0,212,255,0.1)' },
            { label: 'المهام',        value: stats?.pending_tasks ?? 0,      color: '#2E8BFF', bg: 'rgba(46,139,255,0.1)' },
            { label: 'التسليمات',     value: stats?.total_handovers ?? 0,    color: '#FFB24D', bg: 'rgba(255,178,77,0.1)' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-3 text-center"
              style={{ background: s.bg, border: `1px solid ${s.color}33` }}
            >
              <div className="font-black text-2xl" style={{ color: s.color }}>{String(s.value)}</div>
              <div className="text-white/50 text-[10px] mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ─── Menu Sections ──────────────────────────────────────────────── */}
        {MENU_SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="text-white/40 text-[11px] font-black uppercase tracking-wider mb-2 px-1">
              {section.title}
            </h3>
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden divide-y divide-white/5">
              {section.items.map((item) => {
                const inner = (
                  <>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}>
                      <item.icon size={16} style={{ color: item.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-bold">{item.label}</div>
                      <div className="text-white/40 text-[11px] mt-0.5">{item.sub}</div>
                    </div>
                    {item.badge && (
                      <span className="w-5 h-5 rounded-full bg-accent-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                        {item.badge}
                      </span>
                    )}
                    <ChevronLeft size={15} className="text-white/20 flex-shrink-0" />
                  </>
                );

                return item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors"
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors text-right"
                  >
                    {inner}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* ─── Sign Out ─────────────────────────────────────────────────── */}
        <button
          onClick={() => { clearToken(); router.replace('/login'); }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 font-bold text-sm hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={16} />
          تسجيل الخروج
        </button>

      </div>

      {/* ─── Edit Profile Modal ────────────────────────────────────────── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setEditOpen(false)} />
          <div className="relative w-full max-w-lg glass-strong p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-black text-xl">تعديل الملف</h2>
              <button onClick={() => setEditOpen(false)} className="p-2 rounded-xl hover:bg-white/5 text-white/50">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <EditField
                label="الاسم الكامل"
                value={editName}
                onChange={setEditName}
                placeholder="اسمك"
              />
              <EditField
                label="الموقع"
                icon={<MapPin size={15} className="text-white/40" />}
                value={editLocation}
                onChange={setEditLocation}
                placeholder="المدينة، الدولة"
              />
              <div>
                <label className="text-white/60 text-xs font-bold block mb-2">نبذة مختصرة</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="اكتب نبذة تعريفية..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 resize-none text-sm"
                />
              </div>

              {saveError && (
                <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  {saveError}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 py-3 rounded-2xl border border-white/10 text-white/60 font-bold text-sm hover:bg-white/5"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-glow-primary disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>حفظ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function EditField({
  label, value, onChange, placeholder, icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-white/60 text-xs font-bold block mb-2">{label}</label>
      <div className="relative">
        {icon && <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{icon}</span>}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pr-10 pl-4 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] text-sm"
          style={{ paddingRight: icon ? '2.5rem' : '1rem' }}
        />
      </div>
    </div>
  );
}
