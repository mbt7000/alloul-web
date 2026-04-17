'use client';

/**
 * ALLOUL&Q — Post-registration Onboarding Wizard
 * Steps: Account type → Company setup → Payment → Done
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  User, Building2, ArrowLeft, ArrowRight, CheckCircle, Loader2,
  MapPin, Users, Briefcase, Mail, ChevronRight, Sparkles,
  Globe, Phone, CreditCard,
} from 'lucide-react';
import { isAuthenticated, getCachedUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';

type AccountType = 'individual' | 'company' | null;
type Step = 'type' | 'profile' | 'company' | 'payment' | 'done';

const COMPANY_TYPES = [
  'تكنولوجيا ومعلومات',
  'تجارة وتوزيع',
  'خدمات مهنية',
  'تعليم وتدريب',
  'رعاية صحية',
  'عقارات وإنشاء',
  'إعلام وتسويق',
  'مالية ومصرفية',
  'ضيافة وسياحة',
  'أخرى',
];

const TEAM_SIZES = ['1–5', '6–20', '21–50', '51–200', '200+'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('type');
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Company form
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [companyLocation, setCompanyLocation] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  // Individual profile
  const [jobTitle, setJobTitle] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');

  const user = getCachedUser();

  useEffect(() => {
    if (!isAuthenticated()) router.replace('/login');
  }, [router]);

  // Skip if already onboarded
  useEffect(() => {
    const done = localStorage.getItem('alloul_onboarding_done');
    if (done === 'true') router.replace('/');
  }, [router]);

  const handleTypeSelect = (type: AccountType) => {
    setAccountType(type);
    setStep(type === 'company' ? 'company' : 'profile');
  };

  const handleProfileSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ bio, location }),
      });
      localStorage.setItem('alloul_onboarding_done', 'true');
      router.replace('/');
    } catch (e: any) {
      setError(e?.message || 'خطأ في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySubmit = async () => {
    if (!companyName || !companyType || !teamSize) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/companies', {
        method: 'POST',
        body: JSON.stringify({
          name: companyName,
          email: companyEmail || undefined,
          company_type: companyType,
          location: companyLocation || undefined,
          team_size: teamSize,
          phone: companyPhone || undefined,
        }),
      });
      setStep('payment');
    } catch (e: any) {
      // If company already exists, skip to payment
      if (e?.message?.includes('already') || e?.status === 409) {
        setStep('payment');
      } else {
        setError(e?.message || 'خطأ في إنشاء الشركة');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('alloul_onboarding_done', 'true');
    router.replace('/');
  };

  const stepProgress = {
    type: 1,
    profile: 2,
    company: 2,
    payment: 3,
    done: 4,
  }[step];

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="pointer-events-none fixed bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-secondary/10 blur-[140px]" />
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-4 pt-safe-top pt-6 pb-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0">
          <Image src="/icon.png" alt="ALLOUL" width={48} height={48} />
        </div>
        <div className="flex-1">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-all duration-500"
                style={{
                  background:
                    i <= stepProgress
                      ? 'linear-gradient(90deg, #2E8BFF, #00D4FF)'
                      : 'rgba(255,255,255,0.1)',
                }}
              />
            ))}
          </div>
          <p className="text-white/40 text-xs mt-1.5">
            خطوة {stepProgress} من 4
          </p>
        </div>
      </div>

      {/* ─── Step: Account Type ───────────────────────────────────────── */}
      {step === 'type' && (
        <StepType user={user} onSelect={handleTypeSelect} />
      )}

      {/* ─── Step: Individual Profile ────────────────────────────────── */}
      {step === 'profile' && (
        <div className="relative z-10 flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
          <h1 className="text-white font-black text-2xl mb-1">ملفك الشخصي</h1>
          <p className="text-white/50 text-sm mb-8">أخبرنا عنك لتخصيص تجربتك</p>

          <div className="space-y-4 flex-1">
            <FormField
              label="المسمى الوظيفي"
              icon={<Briefcase size={16} className="text-white/40" />}
              placeholder="مثال: مدير مشروع"
              value={jobTitle}
              onChange={setJobTitle}
            />
            <FormField
              label="الموقع"
              icon={<MapPin size={16} className="text-white/40" />}
              placeholder="المدينة، الدولة"
              value={location}
              onChange={setLocation}
            />
            <div>
              <label className="text-white/60 text-xs font-bold block mb-2">نبذة مختصرة</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="اكتب نبذة عنك..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 resize-none"
              />
            </div>

            {error && <ErrorBanner msg={error} />}
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => setStep('type')}
              className="p-3.5 rounded-2xl border border-white/10 text-white/60 hover:bg-white/5"
            >
              <ArrowRight size={18} />
            </button>
            <button
              onClick={handleProfileSave}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-black rounded-2xl py-3.5 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 shadow-glow-primary"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              <span>ابدأ التجربة</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Step: Company Setup ──────────────────────────────────────── */}
      {step === 'company' && (
        <div className="relative z-10 flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
          <h1 className="text-white font-black text-2xl mb-1">إعداد شركتك</h1>
          <p className="text-white/50 text-sm mb-6">أدخل بيانات شركتك لإنشاء حساب الأعمال</p>

          <div className="space-y-4 overflow-y-auto flex-1">
            <FormField
              label="اسم الشركة *"
              icon={<Building2 size={16} className="text-white/40" />}
              placeholder="ALLOUL Corp"
              value={companyName}
              onChange={setCompanyName}
            />
            <FormField
              label="البريد الإلكتروني للشركة"
              icon={<Mail size={16} className="text-white/40" />}
              placeholder="info@company.com"
              value={companyEmail}
              onChange={setCompanyEmail}
              type="email"
            />
            <FormField
              label="الهاتف"
              icon={<Phone size={16} className="text-white/40" />}
              placeholder="+966 5x xxx xxxx"
              value={companyPhone}
              onChange={setCompanyPhone}
              type="tel"
            />
            <FormField
              label="المقر / المدينة"
              icon={<MapPin size={16} className="text-white/40" />}
              placeholder="الرياض، المملكة العربية السعودية"
              value={companyLocation}
              onChange={setCompanyLocation}
            />

            {/* Company type */}
            <div>
              <label className="text-white/60 text-xs font-bold block mb-2">نوع الخدمة *</label>
              <div className="grid grid-cols-2 gap-2">
                {COMPANY_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setCompanyType(t)}
                    className="px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-right"
                    style={{
                      borderColor: companyType === t ? '#2E8BFF' : 'rgba(255,255,255,0.1)',
                      background: companyType === t ? 'rgba(46,139,255,0.15)' : 'rgba(255,255,255,0.03)',
                      color: companyType === t ? '#2E8BFF' : 'rgba(255,255,255,0.6)',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Team size */}
            <div>
              <label className="text-white/60 text-xs font-bold block mb-2">عدد الموظفين *</label>
              <div className="flex gap-2 flex-wrap">
                {TEAM_SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setTeamSize(s)}
                    className="px-4 py-2 rounded-xl border text-xs font-bold transition-all"
                    style={{
                      borderColor: teamSize === s ? '#14E0A4' : 'rgba(255,255,255,0.1)',
                      background: teamSize === s ? 'rgba(20,224,164,0.15)' : 'rgba(255,255,255,0.03)',
                      color: teamSize === s ? '#14E0A4' : 'rgba(255,255,255,0.6)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {error && <ErrorBanner msg={error} />}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep('type')}
              className="p-3.5 rounded-2xl border border-white/10 text-white/60 hover:bg-white/5"
            >
              <ArrowRight size={18} />
            </button>
            <button
              onClick={handleCompanySubmit}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-black rounded-2xl py-3.5 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 shadow-glow-primary"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              <span>التالي — الدفع</span>
              <ArrowLeft size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─── Step: Payment ────────────────────────────────────────────── */}
      {step === 'payment' && (
        <div className="relative z-10 flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
          <h1 className="text-white font-black text-2xl mb-1">اختر خطتك</h1>
          <p className="text-white/50 text-sm mb-6">ابدأ مجاناً ثم ترقّ عند الحاجة</p>

          <div className="space-y-4 flex-1">
            {/* Free trial */}
            <div className="glass-strong p-5 glass-ring-primary">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-black text-lg">تجربة مجانية</h3>
                  <p className="text-white/50 text-xs mt-1">14 يوماً — بدون بطاقة ائتمان</p>
                </div>
                <span className="bg-accent-500/20 text-accent-500 border border-accent-500/30 text-xs font-bold px-3 py-1 rounded-full">
                  مُوصى به
                </span>
              </div>
              <ul className="space-y-2 mb-5">
                {[
                  'وصول كامل لجميع الميزات',
                  'ALLOUL Agent مجاناً',
                  'حتى 10 أعضاء في الفريق',
                  'دعم عبر الدردشة',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                    <CheckCircle size={14} className="text-accent-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleFinish}
                className="w-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-black rounded-2xl py-3.5 shadow-glow-primary hover:opacity-90"
              >
                ابدأ التجربة المجانية
              </button>
            </div>

            {/* Pro plan */}
            <div
              className="glass p-5 cursor-pointer hover:border-primary/40"
              onClick={() => router.push('/pricing')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-base">الباقة الاحترافية</h3>
                  <p className="text-white/50 text-xs mt-1">غير محدود · أعضاء غير محدودين</p>
                </div>
                <div className="text-left">
                  <div className="text-white font-black text-xl">$49</div>
                  <div className="text-white/40 text-xs">/شهر</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-primary-400 text-xs font-bold">
                <span>عرض تفاصيل الباقات</span>
                <ChevronRight size={14} />
              </div>
            </div>

            <div className="glass-subtle text-center text-xs text-white/40 py-3 w-full justify-center">
              <CreditCard size={12} className="text-white/40" />
              <span className="mr-1.5">دفع آمن بالبطاقة · بدون رسوم خفية</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Account Type Selection ───────────────────────────────────────────────────

function StepType({
  user,
  onSelect,
}: {
  user: any;
  onSelect: (t: AccountType) => void;
}) {
  return (
    <div className="relative z-10 flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
      <div className="mb-8">
        {user && (
          <p className="text-white/60 text-sm mb-2">
            مرحباً، <span className="text-white font-bold">{user.name || user.username}</span>
          </p>
        )}
        <h1 className="text-white font-black text-3xl mb-2">
          كيف ستستخدم
          <br />
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            ALLOUL&Q؟
          </span>
        </h1>
        <p className="text-white/50 text-sm">اختر نوع الحساب المناسب لك</p>
      </div>

      <div className="space-y-4 flex-1">
        {/* Individual */}
        <button
          onClick={() => onSelect('individual')}
          className="w-full glass glass-hover p-6 text-right group transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)' }}>
              <User size={24} style={{ color: '#8B5CF6' }} />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-black text-lg mb-1">حساب شخصي</h3>
              <p className="text-white/50 text-sm mb-3">
                مناسب للأفراد، المستقلين، والباحثين عن عمل.
              </p>
              <ul className="space-y-1">
                {['ملف مهني احترافي', 'تتبع الوظائف والفرص', 'شبكة تواصل مهنية'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-white/50">
                    <div className="w-1 h-1 rounded-full bg-purple-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <ChevronRight size={20} className="text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0 mt-1" />
          </div>
        </button>

        {/* Company */}
        <button
          onClick={() => onSelect('company')}
          className="w-full p-6 rounded-2xl text-right group transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(46,139,255,0.12), rgba(0,212,255,0.08))',
            border: '1px solid rgba(46,139,255,0.35)',
            boxShadow: '0 0 0 1px rgba(46,139,255,0.15) inset, 0 20px 60px rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(46,139,255,0.2)', border: '1px solid rgba(46,139,255,0.5)' }}>
              <Building2 size={24} style={{ color: '#2E8BFF' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-black text-lg">حساب شركة</h3>
                <span className="bg-primary-500/20 text-primary-400 border border-primary-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                  الأكثر شعبية
                </span>
              </div>
              <p className="text-white/50 text-sm mb-3">
                لإدارة الفرق والمشاريع والعمليات التجارية.
              </p>
              <ul className="space-y-1">
                {['مساحة عمل كاملة للفريق', 'CRM وإدارة الصفقات', 'ALLOUL Agent الذكي', 'تقارير وتحليلات'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-white/60">
                    <Sparkles size={10} style={{ color: '#2E8BFF' }} className="flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <ChevronRight size={20} className="text-primary-400 group-hover:text-primary-300 transition-colors flex-shrink-0 mt-1" />
          </div>
        </button>
      </div>

      <p className="text-center text-white/30 text-xs mt-6">
        يمكنك تغيير نوع الحساب لاحقاً من الإعدادات
      </p>
    </div>
  );
}

// ─── Reusable components ──────────────────────────────────────────────────────

function FormField({
  label, icon, placeholder, value, onChange, type = 'text',
}: {
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-white/60 text-xs font-bold block mb-2">{label}</label>
      <div className="relative">
        <span className="absolute right-4 top-1/2 -translate-y-1/2">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pr-11 pl-4 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07]"
        />
      </div>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
      <span>⚠️</span>
      <span>{msg}</span>
    </div>
  );
}
