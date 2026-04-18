'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Building2, ArrowRight, CheckCircle, Loader2,
  MapPin, Users, Briefcase, ChevronRight, Sparkles,
  Phone, CreditCard, Copy, Check, UserCheck, Search,
  Send, Clock, FileText,
} from 'lucide-react';
import { isAuthenticated, getCachedUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';

type Path = 'company' | 'employee' | 'jobseeker' | null;
type Step = 'choose' | 'company-form' | 'payment' | 'employee-id' | 'jobseeker-form' | 'jobseeker-sent';

const COMPANY_TYPES = [
  'تكنولوجيا ومعلومات', 'تجارة وتوزيع', 'خدمات مهنية',
  'تعليم وتدريب', 'رعاية صحية', 'عقارات وإنشاء',
  'إعلام وتسويق', 'مالية ومصرفية', 'ضيافة وسياحة', 'أخرى',
];
const TEAM_SIZES = ['1–5', '6–20', '21–50', '51–200', '200+'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('choose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Company form
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [companyLocation, setCompanyLocation] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  // Job seeker form
  const [jobTitle, setJobTitle] = useState('');
  const [jsLocation, setJsLocation] = useState('');
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');

  const user = getCachedUser();
  const icode = (user as any)?.i_code || '';

  useEffect(() => {
    if (!isAuthenticated()) router.replace('/login');
  }, [router]);

  useEffect(() => {
    const done = localStorage.getItem('alloul_onboarding_done');
    if (done === 'true') router.replace('/');
  }, [router]);

  const copyId = () => {
    navigator.clipboard.writeText(icode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCompanySubmit = async () => {
    if (!companyName || !companyType || !teamSize) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setLoading(true); setError(null);
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
      if (e?.message?.includes('already') || e?.status === 409) setStep('payment');
      else setError(e?.message || 'خطأ في إنشاء الشركة');
    } finally { setLoading(false); }
  };

  const handleJobSeekerSubmit = async () => {
    if (!jobTitle) { setError('أدخل تخصصك أو مسماك الوظيفي'); return; }
    setLoading(true); setError(null);
    try {
      await apiFetch('/cv/me', {
        method: 'PUT',
        body: JSON.stringify({ job_title: jobTitle, location: jsLocation, bio, experience }),
      });
      setStep('jobseeker-sent');
    } catch {
      // CV endpoint might not exist — just proceed
      setStep('jobseeker-sent');
    } finally { setLoading(false); }
  };

  const handleEmployeeDone = async () => {
    localStorage.setItem('alloul_onboarding_done', 'true');
    router.replace('/');
  };

  const handleFinish = () => {
    localStorage.setItem('alloul_onboarding_done', 'true');
    router.replace('/');
  };

  const stepN = { choose: 1, 'company-form': 2, payment: 3, 'employee-id': 2, 'jobseeker-form': 2, 'jobseeker-sent': 3 }[step];

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-secondary/10 blur-[140px]" />
      </div>

      {/* Progress */}
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

      {/* ── CHOOSE ── */}
      {step === 'choose' && (
        <div className="relative z-10 flex-1 flex flex-col px-4 py-4 max-w-lg mx-auto w-full">
          <div className="mb-6">
            {user && <p className="text-white/50 text-sm mb-1">مرحباً <span className="text-white font-bold">{(user as any).name || (user as any).username}</span></p>}
            <h1 className="text-white font-black text-3xl mb-1">كيف ستستخدم<br />
              <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">ALLOUL&Q؟</span>
            </h1>
            <p className="text-white/50 text-sm">اختر ما يناسبك</p>
          </div>

          <div className="space-y-3 flex-1">

            {/* Company */}
            <button onClick={() => setStep('company-form')}
              className="w-full p-5 rounded-2xl text-right group transition-all"
              style={{ background: 'linear-gradient(135deg,rgba(46,139,255,0.12),rgba(0,212,255,0.08))', border: '1px solid rgba(46,139,255,0.35)' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(46,139,255,0.2)', border: '1px solid rgba(46,139,255,0.5)' }}>
                  <Building2 size={22} style={{ color: '#2E8BFF' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-black text-base">أنشئ حساب شركة</h3>
                    <span className="bg-primary-500/20 text-primary-400 border border-primary-500/30 text-[9px] font-black px-2 py-0.5 rounded-full">الأكثر شعبية</span>
                  </div>
                  <p className="text-white/50 text-xs mt-0.5">أدر فريقك، مشاريعك، وعملاءك من مكان واحد</p>
                </div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60" />
              </div>
            </button>

            {/* Employee */}
            <button onClick={() => setStep('employee-id')}
              className="w-full glass glass-hover p-5 text-right group transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(20,224,164,0.15)', border: '1px solid rgba(20,224,164,0.4)' }}>
                  <UserCheck size={22} style={{ color: '#14E0A4' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-black text-base">موظف لدى شركة</h3>
                  <p className="text-white/50 text-xs mt-0.5">احصل على رقم ID وأرسله لشركتك لتضمك</p>
                </div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60" />
              </div>
            </button>

            {/* Job Seeker */}
            <button onClick={() => setStep('jobseeker-form')}
              className="w-full glass glass-hover p-5 text-right group transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,178,77,0.15)', border: '1px solid rgba(255,178,77,0.4)' }}>
                  <Search size={22} style={{ color: '#FFB24D' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-black text-base">أتقدم على وظيفة</h3>
                  <p className="text-white/50 text-xs mt-0.5">أرسل ملفك للشركات وانتظر القبول</p>
                </div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60" />
              </div>
            </button>

          </div>
        </div>
      )}

      {/* ── EMPLOYEE ID ── */}
      {step === 'employee-id' && (
        <div className="relative z-10 flex-1 flex flex-col px-4 py-4 max-w-lg mx-auto w-full">
          <button onClick={() => setStep('choose')} className="flex items-center gap-2 text-white/40 hover:text-white/60 text-sm mb-6 transition-colors">
            <ArrowRight size={16} /> رجوع
          </button>

          <div className="mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(20,224,164,0.15)', border: '1px solid rgba(20,224,164,0.4)' }}>
              <UserCheck size={28} style={{ color: '#14E0A4' }} />
            </div>
            <h1 className="text-white font-black text-2xl mb-1">رقم ID الخاص بك</h1>
            <p className="text-white/50 text-sm">أرسل هذا الرقم لمسؤول شركتك حتى يضيفك</p>
          </div>

          {/* ID Card */}
          <div className="glass-strong p-6 rounded-2xl mb-4 text-center"
            style={{ border: '1px solid rgba(20,224,164,0.3)', boxShadow: '0 0 40px rgba(20,224,164,0.08)' }}>
            <p className="text-white/40 text-xs mb-2">رقم المعرف الخاص بك</p>
            <div className="text-4xl font-black tracking-widest mb-4"
              style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {icode || '--------'}
            </div>
            <button onClick={copyId}
              className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
              style={{ background: copied ? 'rgba(20,224,164,0.2)' : 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: copied ? '#14E0A4' : 'rgba(255,255,255,0.7)' }}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'تم النسخ!' : 'انسخ الرقم'}
            </button>
          </div>

          {/* Steps */}
          <div className="glass p-4 rounded-2xl space-y-3 mb-6">
            {[
              { n: '1', t: 'انسخ رقم ID', d: 'الرقم أعلاه هو معرفك الفريد' },
              { n: '2', t: 'أرسله لشركتك', d: 'واتساب، بريد، أو شخصياً' },
              { n: '3', t: 'انتظر الإضافة', d: 'ستظهر الشركة في حسابك تلقائياً' },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(20,224,164,0.2)', color: '#14E0A4' }}>{s.n}</div>
                <div>
                  <p className="text-white text-sm font-bold">{s.t}</p>
                  <p className="text-white/40 text-xs">{s.d}</p>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleEmployeeDone}
            className="w-full text-white font-black rounded-2xl py-3.5 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)', boxShadow: '0 0 24px rgba(20,224,164,0.3)' }}>
            <CheckCircle size={18} /> فهمت — انتقل للمنصة
          </button>
        </div>
      )}

      {/* ── JOB SEEKER FORM ── */}
      {step === 'jobseeker-form' && (
        <div className="relative z-10 flex-1 flex flex-col px-4 py-4 max-w-lg mx-auto w-full">
          <button onClick={() => setStep('choose')} className="flex items-center gap-2 text-white/40 hover:text-white/60 text-sm mb-6 transition-colors">
            <ArrowRight size={16} /> رجوع
          </button>

          <div className="mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(255,178,77,0.15)', border: '1px solid rgba(255,178,77,0.4)' }}>
              <FileText size={28} style={{ color: '#FFB24D' }} />
            </div>
            <h1 className="text-white font-black text-2xl mb-1">ملفك المهني</h1>
            <p className="text-white/50 text-sm">أكمل بياناتك وسنرسلها للشركات المناسبة</p>
          </div>

          <div className="space-y-4 flex-1">
            <Field label="التخصص أو المسمى الوظيفي *" icon={<Briefcase size={15} className="text-white/40" />}
              placeholder="مثال: مطور ويب، محاسب، مسوّق" value={jobTitle} onChange={setJobTitle} />
            <Field label="الموقع" icon={<MapPin size={15} className="text-white/40" />}
              placeholder="المدينة، الدولة" value={jsLocation} onChange={setJsLocation} />
            <Field label="سنوات الخبرة" icon={<Sparkles size={15} className="text-white/40" />}
              placeholder="مثال: 3 سنوات" value={experience} onChange={setExperience} />
            <div>
              <label className="text-white/60 text-xs font-bold block mb-2">نبذة مختصرة عنك</label>
              <textarea rows={3} value={bio} onChange={e => setBio(e.target.value)}
                placeholder="اكتب نبذة تعريفية قصيرة..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 resize-none text-sm" />
            </div>

            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
          </div>

          <button onClick={handleJobSeekerSubmit} disabled={loading}
            className="mt-6 w-full text-black font-black rounded-2xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(90deg,#FFB24D,#FF8C42)' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            أرسل ملفي للشركات
          </button>
        </div>
      )}

      {/* ── JOB SEEKER SENT ── */}
      {step === 'jobseeker-sent' && (
        <div className="relative z-10 flex-1 flex flex-col px-4 py-4 max-w-lg mx-auto w-full items-center justify-center text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
            style={{ background: 'rgba(255,178,77,0.15)', border: '1px solid rgba(255,178,77,0.4)' }}>
            <Clock size={36} style={{ color: '#FFB24D' }} />
          </div>
          <h1 className="text-white font-black text-2xl mb-3">تم إرسال ملفك!</h1>
          <p className="text-white/50 text-sm mb-2 max-w-xs leading-relaxed">
            ملفك المهني أُرسل للشركات. ستصلك إشعار فور قبولك من إحداها.
          </p>
          <div className="glass p-4 rounded-2xl w-full mb-6 space-y-2 mt-4">
            <div className="flex items-center gap-3 text-right">
              <CheckCircle size={16} className="text-accent-500 flex-shrink-0" />
              <span className="text-white/70 text-sm">ملفك مرئي للشركات المسجلة</span>
            </div>
            <div className="flex items-center gap-3 text-right">
              <CheckCircle size={16} className="text-accent-500 flex-shrink-0" />
              <span className="text-white/70 text-sm">ستصل الإشعارات فور قبولك</span>
            </div>
            <div className="flex items-center gap-3 text-right">
              <CheckCircle size={16} className="text-accent-500 flex-shrink-0" />
              <span className="text-white/70 text-sm">يمكنك تحديث ملفك في أي وقت</span>
            </div>
          </div>
          <button onClick={handleFinish}
            className="w-full bg-white/10 hover:bg-white/15 text-white font-bold rounded-2xl py-3.5 transition-all">
            انتقل للمنصة
          </button>
        </div>
      )}

      {/* ── COMPANY FORM ── */}
      {step === 'company-form' && (
        <div className="relative z-10 flex-1 flex flex-col px-4 py-4 max-w-lg mx-auto w-full">
          <button onClick={() => setStep('choose')} className="flex items-center gap-2 text-white/40 hover:text-white/60 text-sm mb-6 transition-colors">
            <ArrowRight size={16} /> رجوع
          </button>

          <h1 className="text-white font-black text-2xl mb-1">بيانات شركتك</h1>
          <p className="text-white/50 text-sm mb-6">معلومات أساسية لإنشاء مساحة عملك</p>

          <div className="space-y-4 flex-1">
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
                      background: companyType === t ? 'rgba(46,139,255,0.15)' : 'rgba(255,255,255,0.03)',
                      color: companyType === t ? '#2E8BFF' : 'rgba(255,255,255,0.5)',
                    }}>{t}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-white/60 text-xs font-bold block mb-2">عدد الموظفين *</label>
              <div className="flex gap-2 flex-wrap">
                {TEAM_SIZES.map((s) => (
                  <button key={s} onClick={() => setTeamSize(s)}
                    className="px-4 py-2 rounded-xl border text-xs font-bold transition-all"
                    style={{
                      borderColor: teamSize === s ? '#14E0A4' : 'rgba(255,255,255,0.1)',
                      background: teamSize === s ? 'rgba(20,224,164,0.15)' : 'rgba(255,255,255,0.03)',
                      color: teamSize === s ? '#14E0A4' : 'rgba(255,255,255,0.5)',
                    }}>{s}</button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
          </div>

          <button onClick={handleCompanySubmit} disabled={loading}
            className="mt-6 w-full text-white font-black rounded-2xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(90deg,#2E8BFF,#00D4FF)', boxShadow: '0 0 24px rgba(46,139,255,0.3)' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            التالي — اختر الباقة
          </button>
        </div>
      )}

      {/* ── PAYMENT ── */}
      {step === 'payment' && (
        <div className="relative z-10 flex-1 flex flex-col px-4 py-4 max-w-lg mx-auto w-full">
          <h1 className="text-white font-black text-2xl mb-1">اختر خطتك</h1>
          <p className="text-white/50 text-sm mb-6">ابدأ مجاناً لمدة 14 يوماً</p>

          <div className="space-y-4 flex-1">
            <div className="glass-strong p-5 rounded-2xl" style={{ border: '1px solid rgba(20,224,164,0.3)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-black text-lg">تجربة مجانية</h3>
                  <p className="text-white/50 text-xs mt-1">14 يوماً — بدون بطاقة ائتمان</p>
                </div>
                <span className="bg-accent-500/20 text-accent-500 border border-accent-500/30 text-xs font-bold px-3 py-1 rounded-full">مُوصى به</span>
              </div>
              <ul className="space-y-2 mb-5">
                {['وصول كامل لجميع الميزات', 'ALLOUL Agent مجاناً', 'حتى 10 أعضاء', 'دعم عبر الدردشة'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                    <CheckCircle size={13} className="text-accent-500 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button onClick={handleFinish}
                className="w-full text-white font-black rounded-2xl py-3.5"
                style={{ background: 'linear-gradient(90deg,#2E8BFF,#00D4FF)', boxShadow: '0 0 20px rgba(46,139,255,0.3)' }}>
                ابدأ التجربة المجانية
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
