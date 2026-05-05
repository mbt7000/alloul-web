'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Lock, Key, Eye, EyeOff, Check, X,
  Loader2, ChevronRight, Briefcase, Copy, CheckCircle2,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { apiFetch, getCurrentUser } from '@/lib/api-client';
import { isAuthenticated, getCachedUser, setCachedUser, type AuthUser } from '@/lib/auth';

export default function SecurityPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(getCachedUser());
  const [loading, setLoading] = useState(true);

  // Set-password form (for Google/social login accounts)
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [setSaving, setSetSaving] = useState(false);
  const [setError, setSetError] = useState<string | null>(null);
  const [setDone, setSetDone] = useState(false);

  // Change-password form (for accounts with existing password)
  const [currentPass, setCurrentPass] = useState('');
  const [changeNew, setChangeNew] = useState('');
  const [changeConfirm, setChangeConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [changeSaving, setChangeSaving] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeDone, setChangeDone] = useState(false);

  // Copy employee_no
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    getCurrentUser()
      .then((me) => { setUser(me); setCachedUser(me); })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const hasPassword = !!(user as any)?.has_password ||
    // We detect by trying — but for now show set form if no indication
    false;

  const copyEmployeeNo = () => {
    if (!user?.employee_no) return;
    navigator.clipboard.writeText(user.employee_no);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSetPassword = async () => {
    setSetError(null);
    if (newPass.length < 8) { setSetError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
    if (newPass !== confirmPass) { setSetError('كلمتا المرور غير متطابقتين'); return; }
    setSetSaving(true);
    try {
      await apiFetch('/auth/set-password', {
        method: 'POST',
        body: JSON.stringify({ new_password: newPass, confirm_password: confirmPass }),
      });
      setSetDone(true);
      setNewPass('');
      setConfirmPass('');
      // Refresh user
      const me = await getCurrentUser();
      setUser(me);
      setCachedUser(me);
    } catch (e: any) {
      setSetError(e?.message || 'حدث خطأ، حاول مرة أخرى');
    } finally {
      setSetSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setChangeError(null);
    if (changeNew.length < 8) { setChangeError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل'); return; }
    if (changeNew !== changeConfirm) { setChangeError('كلمتا المرور غير متطابقتين'); return; }
    setChangeSaving(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPass, new_password: changeNew }),
      });
      setChangeDone(true);
      setCurrentPass('');
      setChangeNew('');
      setChangeConfirm('');
    } catch (e: any) {
      if (e?.message?.includes('social login')) {
        // Has no password yet → show set-password form instead
        setChangeError('حسابك مرتبط بـ Google. أنشئ كلمة مرور أولاً من الخيار أعلاه.');
      } else {
        setChangeError(e?.message || 'كلمة المرور الحالية غير صحيحة');
      }
    } finally {
      setChangeSaving(false);
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

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 glass-chrome px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -mr-1 rounded-xl hover:bg-white/5 text-white/60">
          <ChevronRight size={18} />
        </button>
        <Shield size={18} className="text-orange-400" />
        <h1 className="text-white font-black text-lg flex-1">الأمان والخصوصية</h1>
      </header>

      <div className="px-4 py-5 pb-24 md:pb-10 space-y-5">

        {/* ── Employee Number Card ─────────────────────────────────────────── */}
        {user?.employee_no && (
          <div
            className="rounded-2xl p-4 border"
            style={{
              background: 'linear-gradient(135deg, rgba(46,139,255,0.12), rgba(0,212,255,0.06))',
              borderColor: 'rgba(46,139,255,0.25)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Briefcase size={15} className="text-primary-400" />
              <span className="text-white/60 text-xs font-bold uppercase tracking-wide">رقم الموظف</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-black text-3xl tracking-widest">{user.employee_no}</div>
                <p className="text-white/40 text-xs mt-1">
                  استخدم هذا الرقم للدخول على بوت شكرة في تيليجرام
                </p>
              </div>
              <button
                onClick={copyEmployeeNo}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: copied ? 'rgba(20,224,164,0.15)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${copied ? 'rgba(20,224,164,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: copied ? '#14E0A4' : 'rgba(255,255,255,0.5)',
                }}
              >
                {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                {copied ? 'تم النسخ' : 'نسخ'}
              </button>
            </div>
          </div>
        )}

        {/* ── Set Password (social login — no password yet) ─────────────── */}
        {!setDone ? (
          <div className="rounded-2xl border border-white/8 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2"
              style={{ background: 'rgba(255,178,77,0.06)' }}>
              <Key size={15} className="text-amber-400" />
              <div>
                <div className="text-white text-sm font-bold">إنشاء كلمة مرور</div>
                <div className="text-white/40 text-[11px] mt-0.5">
                  لحساب Google — تُستخدم لبوت شكرة والدخول بالبريد الإلكتروني
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <PasswordField
                label="كلمة المرور الجديدة"
                value={newPass}
                onChange={setNewPass}
                show={showNew}
                onToggle={() => setShowNew(!showNew)}
                placeholder="8 أحرف على الأقل"
              />
              <PasswordField
                label="تأكيد كلمة المرور"
                value={confirmPass}
                onChange={setConfirmPass}
                show={showConfirm}
                onToggle={() => setShowConfirm(!showConfirm)}
                placeholder="أعد كتابة كلمة المرور"
              />

              <PasswordStrength password={newPass} />

              {setError && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <X size={13} className="flex-shrink-0" />
                  {setError}
                </div>
              )}

              <button
                onClick={handleSetPassword}
                disabled={setSaving || !newPass || !confirmPass}
                className="w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #2E8BFF, #00D4FF)',
                  boxShadow: '0 4px 20px rgba(46,139,255,0.3)',
                }}
              >
                {setSaving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                <span className="text-white">إنشاء كلمة المرور</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-secondary/30 bg-secondary/8 p-4 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-secondary-400 flex-shrink-0" />
            <div>
              <div className="text-white text-sm font-bold">تم إنشاء كلمة المرور ✓</div>
              <div className="text-white/50 text-xs mt-0.5">
                يمكنك الآن الدخول على بوت شكرة باستخدام رقمك الوظيفي وكلمة المرور
              </div>
            </div>
          </div>
        )}

        {/* ── Change Password ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/8 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2"
            style={{ background: 'rgba(239,68,68,0.06)' }}>
            <Shield size={15} className="text-red-400" />
            <div>
              <div className="text-white text-sm font-bold">تغيير كلمة المرور</div>
              <div className="text-white/40 text-[11px] mt-0.5">لمن لديه كلمة مرور مسبقاً</div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <PasswordField
              label="كلمة المرور الحالية"
              value={currentPass}
              onChange={setCurrentPass}
              show={showCurrent}
              onToggle={() => setShowCurrent(!showCurrent)}
              placeholder="كلمة مرورك الحالية"
            />
            <PasswordField
              label="كلمة المرور الجديدة"
              value={changeNew}
              onChange={setChangeNew}
              show={false}
              onToggle={() => {}}
              placeholder="كلمة المرور الجديدة"
            />
            <PasswordField
              label="تأكيد كلمة المرور الجديدة"
              value={changeConfirm}
              onChange={setChangeConfirm}
              show={false}
              onToggle={() => {}}
              placeholder="أعد كتابة كلمة المرور الجديدة"
            />

            {changeError && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <X size={13} className="flex-shrink-0" />
                {changeError}
              </div>
            )}
            {changeDone && (
              <div className="flex items-center gap-2 text-secondary-400 text-xs bg-secondary/10 border border-secondary/20 rounded-xl p-3">
                <Check size={13} className="flex-shrink-0" />
                تم تغيير كلمة المرور بنجاح
              </div>
            )}

            <button
              onClick={handleChangePassword}
              disabled={changeSaving || !currentPass || !changeNew || !changeConfirm}
              className="w-full py-3 rounded-2xl border border-white/10 bg-white/5 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-white/8 transition-colors"
            >
              {changeSaving ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
              تغيير كلمة المرور
            </button>
          </div>
        </div>

        {/* ── Info: Shukra Bot ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🤖</span>
            <span className="text-white/60 text-xs font-bold">كيفية الدخول على بوت شكرة</span>
          </div>
          {[
            { step: '١', text: 'افتح تيليجرام وابحث عن بوت شكرة' },
            { step: '٢', text: `أدخل رقمك الوظيفي: ${user?.employee_no || '——'}` },
            { step: '٣', text: 'أدخل كلمة المرور التي أنشأتها في هذه الصفحة' },
            { step: '٤', text: 'ابدأ تسجيل المعاملات المالية بالصوت أو الصورة أو النص' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3 text-sm">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(46,139,255,0.15)', color: '#7DB8FF' }}
              >
                {item.step}
              </span>
              <span className="text-white/60 leading-snug">{item.text}</span>
            </div>
          ))}
        </div>

      </div>
    </AppShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PasswordField({
  label, value, onChange, show, onToggle, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-white/50 text-xs font-bold block mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pr-4 pl-11 text-white placeholder-white/25 focus:outline-none focus:border-primary/50 focus:bg-white/8 text-sm"
          dir="ltr"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = (len >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNum ? 1 : 0) + (hasSpecial ? 1 : 0);
  const labels = ['', 'ضعيفة', 'متوسطة', 'قوية', 'قوية جداً'];
  const colors = ['', '#EF4444', '#FFB24D', '#14E0A4', '#2E8BFF'];
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full transition-all duration-300"
            style={{ background: i <= score ? colors[score] : 'rgba(255,255,255,0.08)' }}
          />
        ))}
      </div>
      {score > 0 && (
        <p className="text-[11px] font-bold" style={{ color: colors[score] }}>
          قوة كلمة المرور: {labels[score]}
        </p>
      )}
    </div>
  );
}
