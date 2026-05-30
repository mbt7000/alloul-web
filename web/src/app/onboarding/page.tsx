'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Building2, ArrowRight, CheckCircle, Loader2,
  MapPin, Briefcase, ChevronRight, Phone, CreditCard,
  Copy, Check, Search, Globe, Hash, Plus, X, UserCheck,
} from 'lucide-react';
import { isAuthenticated, getCachedUser, setCachedUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';

type Step =
  | 'choose'
  | 'owner-company'
  | 'owner-payment'
  | 'seeker-profile'
  | 'seeker-done'
  | 'employee-code';

const COMPANY_TYPES = [
  'تكنولوجيا ومعلومات', 'تجارة وتوزيع', 'خدمات مهنية',
  'تعليم وتدريب', 'رعاية صحية', 'عقارات وإنشاء',
  'إعلام وتسويق', 'مالية ومصرفية', 'ضيافة وسياحة', 'أخرى',
];

const COMMON_SKILLS = ['React', 'Node.js', 'Python', 'SQL', 'UI/UX', 'مبيعات', 'تسويق', 'إدارة مشاريع', 'تصميم جرافيك', 'Excel'];
const COMMON_LANGS  = ['العربية', 'الإنجليزية', 'الفرنسية', 'الأردية', 'الهندية', 'التركية'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('choose');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Owner fields ──────────────────────────────────────────────────────────
  const [companyName,     setCompanyName]     = useState('');
  const [companyEmail,    setCompanyEmail]    = useState('');
  const [companyType,     setCompanyType]     = useState('');
  const [companyLocation, setCompanyLocation] = useState('');
  const [companyPhone,    setCompanyPhone]    = useState('');

  // ── Seeker fields ─────────────────────────────────────────────────────────
  const [seekerTitle,    setSeekerTitle]    = useState('');
  const [seekerPhone,    setSeekerPhone]    = useState('');
  const [seekerLocation, setSeekerLocation] = useState('');
  const [seekerYears,    setSeekerYears]    = useState('');
  const [seekerSummary,  setSeekerSummary]  = useState('');
  const [seekerLinkedin, setSeekerLinkedin] = useState('');
  const [skills,   setSkills]   = useState<string[]>([]);
  const [skillInput,  setSkillInput]  = useState('');
  const [langs,    setLangs]    = useState<string[]>([]);
  const [langInput,   setLangInput]   = useState('');

  const user      = getCachedUser();
  const userICode = (user as any)?.i_code || '';

  useEffect(() => { if (!isAuthenticated()) router.replace('/login'); }, [router]);
  useEffect(() => {
    const u = getCachedUser() as any;
    // Only skip onboarding if BOTH flag is set AND account_type is configured
    if (localStorage.getItem('alloul_onboarding_done') === 'true' && u?.account_type) {
      router.replace('/workspace');
    }
  }, [router]);

  const copyCode = () => {
    navigator.clipboard.writeText(userICode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Path: Employee ────────────────────────────────────────────────────────
  const handleEmployee = async () => {
    setLoading(true); setError(null);
    try {
      const updated = await apiFetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ account_type: 'employee' }),
      });
      setCachedUser(updated as any);
      setStep('employee-code');
    } catch (e: any) {
      setError(e?.message || 'خطأ في الاتصال');
    } finally { setLoading(false); }
  };

  // ── Path: Owner ───────────────────────────────────────────────────────────
  const handleOwnerSubmit = async () => {
    if (!companyName || !companyType) { setError('أدخل اسم الشركة ونوعها'); return; }
    setLoading(true); setError(null);
    try {
      await apiFetch('/companies', {
        method: 'POST',
        body: JSON.stringify({
          name: companyName,
          email: companyEmail || undefined,
          company_type: companyType,
          location: companyLocation || undefined,
          phone: companyPhone || undefined,
        }),
      });
      const updated = await apiFetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ account_type: 'owner' }),
      });
      setCachedUser(updated as any);
      setStep('owner-payment');
    } catch (e: any) {
      if (e?.status === 409 || e?.message?.includes('already')) { setStep('owner-payment'); }
      else setError(e?.message || 'خطأ في إنشاء الشركة');
    } finally { setLoading(false); }
  };

  const handleStartTrial = async () => {
    setLoading(true); setError(null);
    try {
      await apiFetch('/companies/activate-trial', { method: 'POST' });
      localStorage.setItem('alloul_onboarding_done', 'true');
      router.replace('/workspace');
    } catch (e: any) {
      setError(e?.message || 'خطأ في تفعيل التجربة');
    } finally { setLoading(false); }
  };

  // ── Path: Job Seeker ──────────────────────────────────────────────────────
  const addSkill = (s: string) => {
    const v = s.trim();
    if (v && !skills.includes(v)) setSkills([...skills, v]);
    setSkillInput('');
  };
  const addLang = (l: string) => {
    const v = l.trim();
    if (v && !langs.includes(v)) setLangs([...langs, v]);
    setLangInput('');
  };

  const handleSeekerSubmit = async () => {
    setLoading(true); setError(null);
    try {
      const updated = await apiFetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ account_type: 'job_seeker' }),
      });
      setCachedUser(updated as any);

      await apiFetch('/cv/me', {
        method: 'PUT',
        body: JSON.stringify({
          title: seekerTitle || undefined,
          phone: seekerPhone || undefined,
          location: seekerLocation || undefined,
          years_experience: seekerYears ? Number(seekerYears) : undefined,
          summary: seekerSummary || undefined,
          linkedin_url: seekerLinkedin || undefined,
          skills,
          languages: langs,
        }),
      });
      setStep('seeker-done');
    } catch (e: any) {
      setError(e?.message || 'خطأ في حفظ البيانات');
    } finally { setLoading(false); }
  };

  const stepN = { choose: 1, 'owner-company': 2, 'owner-payment': 3, 'seeker-profile': 2, 'seeker-done': 3, 'employee-code': 2 }[step];

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col" dir="rtl">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-secondary/10 blur-[140px]" />
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-4 pt-6 pb-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
          <Image src="/icon.png" alt="ALLOUL" width={40} height={40} />
        </div>
        <div className="flex-1">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-1 flex-1 rounded-full transition-all duration-500"
                style={{ background: i <= stepN ? 'linear-gradient(90deg,#2E8BFF,#00D4FF)' : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
          <p className="text-white/40 text-xs mt-1">خطوة {stepN} من 3</p>
        </div>
      </div>

      {/* ══════════════ STEP: CHOOSE ══════════════ */}
      {step === 'choose' && (
        <div className="relative z-10 flex-1 flex flex-col px-4 py-4 max-w-lg mx-auto w-full">
          <div className="mb-8">
            {user && <p className="text-white/50 text-sm mb-1">مرحباً <span className="text-white font-bold">{(user as any).name || (user as any).username}</span></p>}
            <h1 className="text-white font-black text-3xl mb-1">
              ما هو وضعك<br />
              <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">في سوق العمل؟</span>
            </h1>
            <p className="text-white/50 text-sm">اختر ما يناسبك — سنُعدّ حسابك وفق احتياجاتك</p>
          </div>

          <div className="space-y-3 flex-1">
            {/* صاحب شركة */}
            <button onClick={() => setStep('owner-company')}
              className="w-full p-5 rounded-2xl text-right group transition-all"
              style={{ background: 'linear-gradient(135deg,rgba(46,139,255,0.12),rgba(0,212,255,0.08))', border: '1px solid rgba(46,139,255,0.35)' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(46,139,255,0.2)', border: '1px solid rgba(46,139,255,0.5)' }}>
                  <Building2 size={22} style={{ color: '#2E8BFF' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-white font-black text-base">صاحب شركة</h3>
                    <span className="bg-primary-500/20 text-primary-400 border border-primary-500/30 text-[9px] font-black px-2 py-0.5 rounded-full">الأكثر شعبية</span>
                  </div>
                  <p className="text-white/50 text-xs mt-0.5">أنشئ شركتك، أدر فريقك، وتصفح أفضل الكفاءات للتوظيف</p>
                </div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </div>
            </button>

            {/* باحث عن وظيفة */}
            <button onClick={() => setStep('seeker-profile')}
              className="w-full p-5 rounded-2xl text-right group transition-all"
              style={{ background: 'linear-gradient(135deg,rgba(20,224,164,0.10),rgba(0,212,255,0.06))', border: '1px solid rgba(20,224,164,0.30)' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(20,224,164,0.15)', border: '1px solid rgba(20,224,164,0.4)' }}>
                  <Search size={22} style={{ color: '#14E0A4' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-black text-base">أبحث عن وظيفة</h3>
                  <p className="text-white/50 text-xs mt-0.5">أنشئ ملفك الوظيفي وسيرتك الذاتية ليراك أصحاب الشركات</p>
                </div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </div>
            </button>

            {/* موظف */}
            <button onClick={handleEmployee} disabled={loading}
              className="w-full p-5 rounded-2xl text-right group transition-all"
              style={{ background: 'linear-gradient(135deg,rgba(167,139,250,0.10),rgba(255,178,77,0.06))', border: '1px solid rgba(167,139,250,0.30)' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.4)' }}>
                  {loading ? <Loader2 size={22} style={{ color: '#A78BFA' }} className="animate-spin" /> : <UserCheck size={22} style={{ color: '#A78BFA' }} />}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-black text-base">موظف في شركة</h3>
                  <p className="text-white/50 text-xs mt-0.5">احصل على رقمك الوظيفي الخاص ليضيفك مسؤول الشركة</p>
                </div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </div>
            </button>
          </div>

          {error && <p className="mt-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
        </div>
      )}

      {/* ══════════════ OWNER: COMPANY FORM ══════════════ */}
      {step === 'owner-company' && (
        <div className="relative z-10 flex-1 flex flex-col px-4 py-4 max-w-lg mx-auto w-full">
          <button onClick={() => { setStep('choose'); setError(null); }}
            className="flex items-center gap-2 text-white/40 hover:text-white/60 text-sm mb-6 transition-colors">
            <ArrowRight size={16} /> رجوع
          </button>
          <h1 className="text-white font-black text-2xl mb-1">بيانات شركتك</h1>
          <p className="text-white/50 text-sm mb-6">سيتم إنشاء مساحة عملك فور إكمال هذه الخطوة</p>

          <div className="space-y-4 flex-1 overflow-y-auto pb-4">
            <Field label="اسم الشركة *" icon={<Building2 size={15} className="text-white/40" />}
              placeholder="اسم شركتك" value={companyName} onChange={setCompanyName} />
            <Field label="البريد الإلكتروني للشركة" icon={<span className="text-white/40 text-xs">@</span>}
              placeholder="company@example.com" value={companyEmail} onChange={setCompanyEmail} />
            <Field label="رقم الهاتف" icon={<Phone size={15} className="text-white/40" />}
              placeholder="+966 5x xxx xxxx" value={companyPhone} onChange={setCompanyPhone} />
            <Field label="الموقع / المقر" icon={<MapPin size={15} className="text-white/40" />}
              placeholder="المدينة، الدولة" value={companyLocation} onChange={setCompanyLocation} />

            <div>
              <label className="text-white/60 text-xs font-bold block mb-2">نوع الشركة *</label>
              <div className="flex flex-wrap gap-2">
                {COMPANY_TYPES.map((t) => (
                  <button key={t} onClick={() => setCompanyType(t)}
                    className="px-3 py-1.5 rounded-xl border text-xs font-bold transition-all"
                    style={{
                      borderColor: companyType === t ? '#2E8BFF' : 'rgba(255,255,255,0.1)',
                      background:  companyType === t ? 'rgba(46,139,255,0.15)' : 'rgba(255,255,255,0.03)',
                      color:       companyType === t ? '#2E8BFF' : 'rgba(255,255,255,0.5)',
                    }}>{t}</button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
          </div>

          <button onClick={handleOwnerSubmit} disabled={loading}
            className="mt-4 w-full text-white font-black rounded-2xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(90deg,#2E8BFF,#00D4FF)', boxShadow: '0 0 24px rgba(46,139,255,0.3)' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            التالي — اختر الباقة
          </button>
        </div>
      )}

      {/* ══════════════ OWNER: PAYMENT ══════════════ */}
      {step === 'owner-payment' && (
        <div className="relative z-10 flex-1 flex flex-col px-4 py-4 max-w-lg mx-auto w-full">
          <h1 className="text-white font-black text-2xl mb-1">اختر خطتك</h1>
          <p className="text-white/50 text-sm mb-6">ابدأ مجاناً لمدة 14 يوماً — بدون بطاقة</p>

          <div className="space-y-4 flex-1">
            <div className="glass-strong p-5 rounded-2xl" style={{ border: '1px solid rgba(20,224,164,0.35)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-black text-lg">تجربة مجانية</h3>
                  <p className="text-white/50 text-xs mt-0.5">14 يوماً — بدون بطاقة ائتمان</p>
                </div>
                <span className="bg-accent-500/20 text-accent-500 border border-accent-500/30 text-xs font-bold px-3 py-1 rounded-full">مُوصى به</span>
              </div>
              <ul className="space-y-2 mb-5">
                {['وصول كامل لجميع الميزات', 'ALLOUL Agent مجاناً', 'حتى 10 أعضاء', 'لوحة توظيف كاملة', 'دعم عبر الدردشة'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                    <CheckCircle size={13} className="text-accent-500 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button onClick={handleStartTrial}
                className="w-full text-white font-black rounded-2xl py-3.5"
                style={{ background: 'linear-gradient(90deg,#2E8BFF,#00D4FF)', boxShadow: '0 0 20px rgba(46,139,255,0.3)' }}>
                ابدأ التجربة المجانية →
              </button>
            </div>

            <div className="glass p-5 rounded-2xl cursor-pointer hover:border-primary/40 transition-all" onClick={() => router.push('/pricing')}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold">الباقة الاحترافية</h3>
                  <p className="text-white/40 text-xs mt-0.5">غير محدود · أعضاء غير محدودين</p>
                </div>
                <div className="text-left">
                  <div className="text-white font-black text-xl">$49</div>
                  <div className="text-white/40 text-xs">/شهر</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-primary-400 text-xs font-bold">
                <span>عرض تفاصيل الباقات</span> <ChevronRight size={13} />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-white/30 text-xs">
              <CreditCard size={12} /> دفع آمن بالبطاقة · بدون رسوم خفية
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ SEEKER: PROFILE FORM ══════════════ */}
      {step === 'seeker-profile' && (
        <div className="relative z-10 flex-1 flex flex-col px-4 py-4 max-w-lg mx-auto w-full">
          <button onClick={() => { setStep('choose'); setError(null); }}
            className="flex items-center gap-2 text-white/40 hover:text-white/60 text-sm mb-6 transition-colors">
            <ArrowRight size={16} /> رجوع
          </button>
          <h1 className="text-white font-black text-2xl mb-1">ملفك الوظيفي</h1>
          <p className="text-white/50 text-sm mb-6">أصحاب الشركات سيرون هذا الملف عند البحث عن كفاءات</p>

          <div className="space-y-4 flex-1 overflow-y-auto pb-4">
            <Field label="المسمى الوظيفي" icon={<Briefcase size={15} className="text-white/40" />}
              placeholder="مثال: مطور واجهات أمامية" value={seekerTitle} onChange={setSeekerTitle} />
            <Field label="رقم الهاتف" icon={<Phone size={15} className="text-white/40" />}
              placeholder="+966 5x xxx xxxx" value={seekerPhone} onChange={setSeekerPhone} />
            <Field label="الموقع / الدولة" icon={<MapPin size={15} className="text-white/40" />}
              placeholder="المدينة، الدولة" value={seekerLocation} onChange={setSeekerLocation} />
            <Field label="سنوات الخبرة" icon={<span className="text-white/40 text-xs">سنة</span>}
              placeholder="مثال: 3" value={seekerYears} onChange={setSeekerYears} />
            <Field label="رابط LinkedIn (اختياري)" icon={<Globe size={15} className="text-white/40" />}
              placeholder="linkedin.com/in/username" value={seekerLinkedin} onChange={setSeekerLinkedin} />

            {/* Summary */}
            <div>
              <label className="text-white/60 text-xs font-bold block mb-2">نبذة مختصرة</label>
              <textarea rows={3} value={seekerSummary} onChange={e => setSeekerSummary(e.target.value)}
                placeholder="اكتب نبذة تعريفية عنك وعن تجربتك..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-500/50 resize-none text-sm" />
            </div>

            {/* Skills */}
            <div>
              <label className="text-white/60 text-xs font-bold block mb-2">المهارات</label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); } }}
                  placeholder="أضف مهارة + Enter"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-500/50 text-sm" />
                <button onClick={() => addSkill(skillInput)} className="px-3 py-2.5 rounded-xl transition-colors"
                  style={{ background: 'rgba(20,224,164,0.15)', border: '1px solid rgba(20,224,164,0.4)', color: '#14E0A4' }}>
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_SKILLS.filter(s => !skills.includes(s)).map(s => (
                  <button key={s} onClick={() => addSkill(s)}
                    className="text-xs px-2.5 py-1 rounded-lg border transition-colors"
                    style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)' }}>
                    + {s}
                  </button>
                ))}
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map(s => (
                    <span key={s} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-bold"
                      style={{ background: 'rgba(20,224,164,0.15)', border: '1px solid rgba(20,224,164,0.35)', color: '#14E0A4' }}>
                      {s}
                      <button onClick={() => setSkills(skills.filter(x => x !== s))} className="hover:text-white transition-colors">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Languages */}
            <div>
              <label className="text-white/60 text-xs font-bold block mb-2">اللغات</label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={langInput} onChange={e => setLangInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLang(langInput); } }}
                  placeholder="أضف لغة + Enter"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                <button onClick={() => addLang(langInput)} className="px-3 py-2.5 rounded-xl transition-colors"
                  style={{ background: 'rgba(46,139,255,0.15)', border: '1px solid rgba(46,139,255,0.4)', color: '#2E8BFF' }}>
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_LANGS.filter(l => !langs.includes(l)).map(l => (
                  <button key={l} onClick={() => addLang(l)}
                    className="text-xs px-2.5 py-1 rounded-lg border transition-colors"
                    style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)' }}>
                    + {l}
                  </button>
                ))}
              </div>
              {langs.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {langs.map(l => (
                    <span key={l} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-bold"
                      style={{ background: 'rgba(46,139,255,0.15)', border: '1px solid rgba(46,139,255,0.35)', color: '#2E8BFF' }}>
                      {l}
                      <button onClick={() => setLangs(langs.filter(x => x !== l))} className="hover:text-white transition-colors">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
          </div>

          <button onClick={handleSeekerSubmit} disabled={loading}
            className="mt-4 w-full text-white font-black rounded-2xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)', boxShadow: '0 0 24px rgba(20,224,164,0.3)' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            احفظ الملف الوظيفي
          </button>
        </div>
      )}

      {/* ══════════════ SEEKER: DONE ══════════════ */}
      {step === 'seeker-done' && (
        <div className="relative z-10 flex-1 flex flex-col px-4 py-4 max-w-lg mx-auto w-full items-center justify-center text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
            style={{ background: 'rgba(20,224,164,0.15)', border: '1px solid rgba(20,224,164,0.4)' }}>
            <CheckCircle size={40} style={{ color: '#14E0A4' }} />
          </div>
          <h1 className="text-white font-black text-2xl mb-3">ملفك جاهز!</h1>
          <p className="text-white/60 text-sm mb-6 max-w-xs leading-relaxed">
            أصحاب الشركات يستطيعون الآن مشاهدة سيرتك الذاتية والتواصل معك. يمكنك أيضاً تصفح الوظائف المتاحة والتقديم عليها.
          </p>
          <button onClick={() => { localStorage.setItem('alloul_onboarding_done', 'true'); router.replace('/workspace/hiring'); }}
            className="w-full text-white font-black rounded-2xl py-3.5"
            style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)', boxShadow: '0 0 20px rgba(20,224,164,0.3)' }}>
            استعرض الوظائف المتاحة →
          </button>
        </div>
      )}

      {/* ══════════════ EMPLOYEE: CODE ══════════════ */}
      {step === 'employee-code' && (
        <div className="relative z-10 flex-1 flex flex-col px-4 py-4 max-w-lg mx-auto w-full">
          <div className="mb-8 text-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 mx-auto"
              style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.4)' }}>
              <Hash size={36} style={{ color: '#A78BFA' }} />
            </div>
            <h1 className="text-white font-black text-2xl mb-2">رقمك الوظيفي</h1>
            <p className="text-white/50 text-sm">شارك هذا الرقم مع مسؤول شركتك ليضيفك لمساحة عمل الشركة</p>
          </div>

          {/* Big code display */}
          <div className="glass-strong p-6 rounded-2xl text-center mb-6"
            style={{ border: '1px solid rgba(167,139,250,0.35)' }}>
            <p className="text-white/40 text-xs mb-3">رقم ID الخاص بك</p>
            <p className="text-white font-black text-4xl tracking-[0.3em] mb-4" style={{ fontFamily: 'monospace' }}>
              {userICode || '--------'}
            </p>
            <button onClick={copyCode}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
              style={{ background: copied ? 'rgba(20,224,164,0.2)' : 'rgba(167,139,250,0.2)', border: `1px solid ${copied ? 'rgba(20,224,164,0.4)' : 'rgba(167,139,250,0.4)'}`, color: copied ? '#14E0A4' : '#A78BFA' }}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'تم النسخ!' : 'انسخ الرقم'}
            </button>
          </div>

          {/* Steps */}
          <div className="glass p-4 rounded-2xl space-y-3 mb-6 text-right">
            <p className="text-white/60 text-xs font-black mb-3">كيف تنضم لشركتك؟</p>
            {[
              'شارك رقمك مع مسؤول شركتك',
              'سيضيفك المسؤول لمساحة عمل الشركة',
              'ستصلك إشعار فور إضافتك',
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
                  style={{ background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.4)', color: '#A78BFA' }}>
                  {i + 1}
                </div>
                <p className="text-white/60 text-sm">{t}</p>
              </div>
            ))}
          </div>

          <button onClick={() => { localStorage.setItem('alloul_onboarding_done', 'true'); router.replace('/lobby'); }}
            className="w-full text-white font-black rounded-2xl py-3.5"
            style={{ background: 'linear-gradient(90deg,#A78BFA,#2E8BFF)', boxShadow: '0 0 20px rgba(167,139,250,0.3)' }}>
            ادخل — في انتظار إضافتك
          </button>
          <button onClick={async () => {
            try { await apiFetch('/auth/me', { method: 'PATCH', body: JSON.stringify({ account_type: null }) }); } catch {}
            localStorage.removeItem('alloul_onboarding_done');
            setStep('choose');
          }} className="w-full text-white/40 text-sm font-bold rounded-2xl py-2.5 mt-2 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            ← اختيار نوع حساب مختلف
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, icon, placeholder, value, onChange }: {
  label: string; icon: React.ReactNode; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-white/60 text-xs font-bold block mb-2">{label}</label>
      <div className="relative">
        <div className="absolute right-4 top-1/2 -translate-y-1/2">{icon}</div>
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-11 pl-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] text-sm" />
      </div>
    </div>
  );
}
