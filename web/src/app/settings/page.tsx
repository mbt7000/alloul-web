'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, User, Lock, Bell, Building2, Shield,
  Loader2, Check, Camera, ChevronRight, LogOut, Users,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { apiFetch, ApiError } from '@/lib/api-client';
import { isAuthenticated, clearToken, getCachedUser, setCachedUser } from '@/lib/auth';

type Tab = 'profile' | 'account' | 'company' | 'notifications';

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Profile
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // Company
  const [companyName, setCompanyName] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');
  const [memberRole, setMemberRole] = useState('');

  const cachedUser = getCachedUser() as any;

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    (async () => {
      try {
        const me = await apiFetch<any>('/auth/me');
        setName(me.name || '');
        setBio(me.bio || '');
        setLocation(me.location || '');
        setAvatarUrl(me.avatar_url || '');

        // Company info
        try {
          const company = await apiFetch<any>('/companies/my');
          setCompanyName(company.name || '');
          setCompanyIndustry(company.industry || '');
          setMemberRole(company.my_role || '');
        } catch { /* not in company */ }
      } catch (e: any) {
        if (e instanceof ApiError && e.status === 401) { clearToken(); router.replace('/login'); }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const showSuccess = (msg: string) => {
    setSuccess(msg); setError('');
    setTimeout(() => setSuccess(''), 3000);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await apiFetch<any>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name || undefined,
          bio: bio || undefined,
          location: location || undefined,
          avatar_url: avatarUrl || undefined,
        }),
      });
      setCachedUser(updated);
      showSuccess('تم حفظ الملف الشخصي');
    } catch { setError('فشل الحفظ، حاول مجدداً'); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (newPw !== confirmPw) { setError('كلمات المرور غير متطابقة'); return; }
    if (newPw.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    setSaving(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      showSuccess('تم تغيير كلمة المرور بنجاح');
    } catch (e: any) {
      setError(e?.detail || 'كلمة المرور الحالية غير صحيحة');
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    clearToken();
    document.cookie = 'alloul_auth=; path=/; max-age=0';
    router.push('/login');
  };

  const TABS: { key: Tab; icon: any; label: string }[] = [
    { key: 'profile', icon: User, label: 'الملف الشخصي' },
    { key: 'account', icon: Lock, label: 'الحساب والأمان' },
    { key: 'company', icon: Building2, label: 'الشركة' },
    { key: 'notifications', icon: Bell, label: 'الإشعارات' },
  ];

  return (
    <AppShell>
      <header className="sticky top-0 z-20 bg-dark-bg-900/90 backdrop-blur-xl border-b border-white/8 px-4 py-3 flex items-center gap-3" dir="rtl">
        <Link href="/workspace" className="p-2 -mr-2 rounded-full hover:bg-white/5 text-white/60">
          <ArrowRight size={18} />
        </Link>
        <h1 className="text-white font-black text-[17px] flex-1">الإعدادات</h1>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={22} className="text-primary animate-spin" />
        </div>
      ) : (
        <div className="pb-24 md:pb-8" dir="rtl">
          {/* Tab bar */}
          <div className="flex gap-1 px-4 py-3 overflow-x-auto border-b border-white/5">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                    tab === t.key
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'text-white/50 hover:bg-white/5 hover:text-white'
                  }`}>
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {(success || error) && (
            <div className={`mx-4 mt-3 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 ${
              success ? 'bg-accent-500/15 text-accent-500 border border-accent-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'
            }`}>
              {success ? <Check size={14} /> : null}
              {success || error}
            </div>
          )}

          <div className="px-4 py-4 space-y-4">

            {/* ── Profile Tab ─────────────────────────────────── */}
            {tab === 'profile' && (
              <>
                {/* Avatar */}
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-white/[0.02]">
                  <div className="relative">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="avatar" className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center border border-white/10">
                        <span className="text-white font-black text-2xl">
                          {(name || cachedUser?.username || 'U').slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-dark-bg-900">
                      <Camera size={10} className="text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">{name || cachedUser?.username}</p>
                    <p className="text-white/40 text-xs">@{cachedUser?.username}</p>
                    <input
                      value={avatarUrl}
                      onChange={e => setAvatarUrl(e.target.value)}
                      placeholder="رابط صورة الملف الشخصي"
                      className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-white/50 text-xs font-bold mb-1.5 block">الاسم الكامل</label>
                    <input value={name} onChange={e => setName(e.target.value)}
                      placeholder="اسمك الكامل"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                  </div>
                  <div>
                    <label className="text-white/50 text-xs font-bold mb-1.5 block">نبذة عنك</label>
                    <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                      placeholder="اكتب نبذة قصيرة عن نفسك..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm resize-none" />
                  </div>
                  <div>
                    <label className="text-white/50 text-xs font-bold mb-1.5 block">الموقع</label>
                    <input value={location} onChange={e => setLocation(e.target.value)}
                      placeholder="مدينتك أو بلدك"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                  </div>
                </div>

                <button onClick={saveProfile} disabled={saving}
                  className="w-full py-3 rounded-xl text-white font-black disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(90deg,#00D4FF,#2E8BFF)' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  حفظ التغييرات
                </button>
              </>
            )}

            {/* ── Account Tab ─────────────────────────────────── */}
            {tab === 'account' && (
              <>
                <div className="p-4 rounded-2xl border border-white/8 bg-white/[0.02]">
                  <p className="text-white font-bold text-sm mb-1">البريد الإلكتروني</p>
                  <p className="text-white/50 text-sm">{cachedUser?.email || '—'}</p>
                  <p className="text-white/30 text-xs mt-1">لا يمكن تغيير البريد الإلكتروني حالياً</p>
                </div>

                <div className="p-4 rounded-2xl border border-white/8 bg-white/[0.02] space-y-3">
                  <p className="text-white font-bold text-sm mb-2">تغيير كلمة المرور</p>
                  <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                    placeholder="كلمة المرور الحالية"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                  <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                    placeholder="كلمة المرور الجديدة"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                  <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                    placeholder="تأكيد كلمة المرور الجديدة"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                  <button onClick={changePassword} disabled={saving || !currentPw || !newPw}
                    className="w-full py-3 rounded-xl text-white font-black disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)' }}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                    <span style={{ color: '#8B5CF6' }}>تحديث كلمة المرور</span>
                  </button>
                </div>

                <button onClick={handleLogout}
                  className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/15 transition-all">
                  <LogOut size={16} />
                  تسجيل الخروج
                </button>
              </>
            )}

            {/* ── Company Tab ─────────────────────────────────── */}
            {tab === 'company' && (
              <>
                {companyName ? (
                  <>
                    <div className="p-4 rounded-2xl border border-white/8 bg-white/[0.02] space-y-3">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                          <Building2 size={18} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-white font-bold">{companyName}</p>
                          {companyIndustry && <p className="text-white/50 text-xs">{companyIndustry}</p>}
                        </div>
                      </div>
                      {memberRole && (
                        <div className="flex items-center justify-between py-2 border-t border-white/5">
                          <span className="text-white/50 text-sm">دورك في الشركة</span>
                          <span className="text-white font-bold text-sm capitalize">{memberRole}</span>
                        </div>
                      )}
                    </div>

                    <Link href="/workspace/team"
                      className="flex items-center justify-between p-4 rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                      <div className="flex items-center gap-3">
                        <Users size={18} className="text-accent-500" />
                        <span className="text-white font-bold text-sm">إدارة الفريق</span>
                      </div>
                      <ChevronRight size={16} className="text-white/30" />
                    </Link>
                  </>
                ) : (
                  <div className="p-8 rounded-2xl border border-white/8 bg-white/[0.02] text-center">
                    <Building2 size={32} className="text-white/20 mx-auto mb-3" />
                    <p className="text-white/60 font-bold mb-1">لست في شركة بعد</p>
                    <p className="text-white/30 text-sm mb-4">انضم إلى شركة أو أنشئ شركتك</p>
                    <Link href="/onboarding"
                      className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(90deg,#00D4FF,#2E8BFF)' }}>
                      البدء
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* ── Notifications Tab ─────────────────────────────── */}
            {tab === 'notifications' && (
              <>
                <div className="p-4 rounded-2xl border border-white/8 bg-white/[0.02] space-y-4">
                  <p className="text-white font-bold text-sm">تفضيلات الإشعارات</p>
                  {[
                    { label: 'طلبات الانضمام للشركة', desc: 'عندما يطلب شخص الانضمام لشركتك' },
                    { label: 'المهام الجديدة', desc: 'عند تكليفك بمهمة جديدة' },
                    { label: 'التسليمات', desc: 'إشعارات التسليمات وتحديثاتها' },
                    { label: 'الاجتماعات', desc: 'تذكير قبل بدء الاجتماع' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{item.label}</p>
                        <p className="text-white/40 text-xs">{item.desc}</p>
                      </div>
                      <div className="w-10 h-6 rounded-full bg-primary/30 border border-primary/50 flex items-center px-1 cursor-pointer">
                        <div className="w-4 h-4 rounded-full bg-primary ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/workspace/inbox"
                  className="flex items-center justify-between p-4 rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-3">
                    <Bell size={18} className="text-primary" />
                    <span className="text-white font-bold text-sm">عرض كل الإشعارات</span>
                  </div>
                  <ChevronRight size={16} className="text-white/30" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
