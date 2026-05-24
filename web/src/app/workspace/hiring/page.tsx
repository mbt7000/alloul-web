'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, Loader2, Plus, X, Briefcase, MapPin, Users,
  FileText, Star, Globe, Phone, Mail, Linkedin, ExternalLink,
  ChevronDown, ChevronUp, Check, XCircle, MessageSquare,
  Search, Filter, BookOpen, Send, Clock, CheckCircle2,
  UserPlus, Copy, Link2, Hash, CheckCheck, RefreshCw,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { apiFetch, ApiError } from '@/lib/api-client';
import { isAuthenticated, clearToken, getCachedUser } from '@/lib/auth';

// ── Types ────────────────────────────────────────────────────────────────────

interface Job {
  id: number; title: string; company_name?: string; company_industry?: string;
  job_type?: string; location?: string; description?: string;
  salary_range?: string; required_skills?: string[]; min_experience?: number;
  applications_count?: number; is_active?: boolean; created_at?: string;
  applied_by_me?: boolean;
}

interface Applicant {
  id: number; job_id: number; job_title?: string;
  applicant_id: number; applicant_name?: string; applicant_username?: string;
  cover_letter?: string; status: string; created_at?: string; company_name?: string;
}

interface CV {
  id?: number; user_id?: number; full_name?: string; title?: string;
  summary?: string; phone?: string; email?: string; location?: string;
  years_experience?: number; skills?: string[]; education?: string[];
  certifications?: string[]; languages?: string[];
  linkedin_url?: string; portfolio_url?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const JOB_TYPE_LABEL: Record<string, string> = {
  full_time: 'دوام كامل', part_time: 'دوام جزئي',
  contract: 'عقد مؤقت', internship: 'تدريب', remote: 'عن بُعد',
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:  { label: 'قيد المراجعة', color: '#FFB24D' },
  reviewed: { label: 'تمت المراجعة', color: '#2E8BFF' },
  accepted: { label: 'مقبول',        color: '#14E0A4' },
  rejected: { label: 'مرفوض',       color: '#EF4444' },
};

function Tag({ children, color = '#2E8BFF' }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {children}
    </span>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function HiringPage() {
  const router = useRouter();
  const user = getCachedUser() as any;
  const isAdmin = ['owner', 'admin', 'manager'].includes(user?.role ?? '');

  type View = 'jobs' | 'applicants' | 'my-cv' | 'my-apps' | 'add-member';
  const [view, setView] = useState<View>('jobs');

  // Add-member state
  const [addMethod,    setAddMethod]    = useState<'email' | 'icode'>('email');
  const [addEmail,     setAddEmail]     = useState('');
  const [addIcode,     setAddIcode]     = useState('');
  const [addRole,      setAddRole]      = useState('employee');
  const [addLoading,   setAddLoading]   = useState(false);
  const [addMsg,       setAddMsg]       = useState<{ ok: boolean; text: string } | null>(null);
  const [inviteLink,   setInviteLink]   = useState('');
  const [linkLoading,  setLinkLoading]  = useState(false);
  const [linkCopied,   setLinkCopied]   = useState(false);
  const [loading, setLoading] = useState(true);

  // Jobs
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [companyJobs, setCompanyJobs] = useState<Job[]>([]);
  const [jobSearch, setJobSearch] = useState('');
  const [expandedJob, setExpandedJob] = useState<number | null>(null);
  const [showNewJob, setShowNewJob] = useState(false);

  // Applicants (company admin view)
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [cvCache, setCvCache] = useState<Record<number, CV>>({});
  const [openCvId, setOpenCvId] = useState<number | null>(null);
  const [updatingApp, setUpdatingApp] = useState<number | null>(null);

  // My CV
  const [cv, setCv] = useState<CV>({});
  const [cvSaving, setCvSaving] = useState(false);
  const [cvMsg, setCvMsg] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [langInput, setLangInput] = useState('');

  // My Applications
  const [myApps, setMyApps] = useState<Applicant[]>([]);

  // New Job form
  const [jTitle, setJTitle] = useState('');
  const [jType, setJType] = useState('full_time');
  const [jLocation, setJLocation] = useState('');
  const [jSalary, setJSalary] = useState('');
  const [jDesc, setJDesc] = useState('');
  const [jMinExp, setJMinExp] = useState('');
  const [jSaving, setJSaving] = useState(false);

  // Apply modal
  const [applyJobId, setApplyJobId] = useState<number | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    loadAll();
  }, [router]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [jobsRes, myAppsRes] = await Promise.allSettled([
        apiFetch<Job[]>('/jobs/'),
        apiFetch<Applicant[]>('/jobs/my-applications'),
      ]);
      if (jobsRes.status === 'fulfilled') setAllJobs(Array.isArray(jobsRes.value) ? jobsRes.value : []);
      if (myAppsRes.status === 'fulfilled') setMyApps(Array.isArray(myAppsRes.value) ? myAppsRes.value : []);

      if (isAdmin) {
        const [cjRes] = await Promise.allSettled([apiFetch<Job[]>('/jobs/my-company')]);
        if (cjRes.status === 'fulfilled') {
          const jobs = Array.isArray(cjRes.value) ? cjRes.value : [];
          setCompanyJobs(jobs);
          // Load all applicants for all company jobs
          const appResults = await Promise.allSettled(jobs.map(j => apiFetch<Applicant[]>(`/jobs/${j.id}/applications`)));
          const allApps: Applicant[] = [];
          appResults.forEach(r => { if (r.status === 'fulfilled' && Array.isArray(r.value)) allApps.push(...r.value); });
          setApplicants(allApps);
        }
      }

      // Load my CV
      try {
        const myCv = await apiFetch<CV>('/cv/me');
        setCv(myCv);
      } catch { setCv({}); }
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) { clearToken(); router.replace('/login'); }
    } finally { setLoading(false); }
  };

  const createJob = async () => {
    if (!jTitle.trim()) return;
    setJSaving(true);
    try {
      const created = await apiFetch<Job>('/jobs/', {
        method: 'POST',
        body: JSON.stringify({
          title: jTitle.trim(), job_type: jType,
          location: jLocation || undefined, salary_range: jSalary || undefined,
          description: jDesc || undefined,
          min_experience: jMinExp ? parseInt(jMinExp) : undefined,
        }),
      });
      setCompanyJobs(prev => [created, ...prev]);
      setAllJobs(prev => [created, ...prev]);
      setJTitle(''); setJType('full_time'); setJLocation(''); setJSalary(''); setJDesc(''); setJMinExp('');
      setShowNewJob(false);
    } catch { } finally { setJSaving(false); }
  };

  const applyToJob = async () => {
    if (!applyJobId) return;
    setApplying(true);
    try {
      await apiFetch(`/jobs/${applyJobId}/apply`, {
        method: 'POST',
        body: JSON.stringify({ cover_letter: coverLetter || undefined }),
      });
      setAllJobs(prev => prev.map(j => j.id === applyJobId ? { ...j, applied_by_me: true, applications_count: (j.applications_count || 0) + 1 } : j));
      setCoverLetter(''); setApplyJobId(null);
    } catch { } finally { setApplying(false); }
  };

  const updateAppStatus = async (appId: number, jobId: number, status: string) => {
    setUpdatingApp(appId);
    try {
      await apiFetch(`/jobs/${jobId}/applications/${appId}?status=${status}`, { method: 'PATCH' });
      setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
    } catch { } finally { setUpdatingApp(null); }
  };

  const loadCv = async (userId: number) => {
    if (cvCache[userId]) { setOpenCvId(userId); return; }
    try {
      const data = await apiFetch<CV>(`/cv/${userId}`);
      setCvCache(prev => ({ ...prev, [userId]: data }));
      setOpenCvId(userId);
    } catch { }
  };

  const saveCV = async () => {
    setCvSaving(true); setCvMsg('');
    try {
      const saved = await apiFetch<CV>('/cv/me', { method: 'PUT', body: JSON.stringify(cv) });
      setCv(saved); setCvMsg('تم حفظ السيرة الذاتية ✓');
      setTimeout(() => setCvMsg(''), 3000);
    } catch { setCvMsg('فشل الحفظ'); } finally { setCvSaving(false); }
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s) return;
    setCv(prev => ({ ...prev, skills: [...(prev.skills || []), s] }));
    setSkillInput('');
  };

  const addLang = () => {
    const l = langInput.trim();
    if (!l) return;
    setCv(prev => ({ ...prev, languages: [...(prev.languages || []), l] }));
    setLangInput('');
  };

  const filteredJobs = allJobs.filter(j =>
    !jobSearch || j.title?.toLowerCase().includes(jobSearch.toLowerCase()) ||
    j.company_name?.toLowerCase().includes(jobSearch.toLowerCase())
  );

  const handleAddByEmail = async () => {
    if (!addEmail.trim()) return;
    setAddLoading(true); setAddMsg(null);
    try {
      await apiFetch('/companies/invite-email', {
        method: 'POST',
        body: JSON.stringify({ email: addEmail.trim(), role: addRole }),
      });
      setAddMsg({ ok: true, text: `تم إرسال الدعوة إلى ${addEmail.trim()}` });
      setAddEmail('');
    } catch (e: any) {
      setAddMsg({ ok: false, text: e?.detail || e?.message || 'فشل إرسال الدعوة' });
    } finally { setAddLoading(false); }
  };

  const handleAddByIcode = async () => {
    if (!addIcode.trim()) return;
    setAddLoading(true); setAddMsg(null);
    try {
      await apiFetch('/companies/invite', {
        method: 'POST',
        body: JSON.stringify({ i_code: addIcode.trim(), role: addRole }),
      });
      setAddMsg({ ok: true, text: 'تم إرسال الدعوة — سيصله إشعار لقبولها' });
      setAddIcode('');
    } catch (e: any) {
      setAddMsg({ ok: false, text: e?.detail || e?.message || 'لم يُعثر على مستخدم بهذا الرمز' });
    } finally { setAddLoading(false); }
  };

  const loadInviteLink = async () => {
    setLinkLoading(true);
    try {
      const data = await apiFetch('/companies/invite-link');
      const base = process.env.NEXT_PUBLIC_API_URL?.replace('api.', '') || 'https://alloul.app';
      setInviteLink(`${base}/join?code=${data.invite_code}`);
    } catch {} finally { setLinkLoading(false); }
  };

  // Load invite link when tab opens
  useEffect(() => {
    if (view === 'add-member' && isAdmin && !inviteLink) loadInviteLink();
  }, [view]);

  const VIEWS: { key: View; label: string; adminOnly?: boolean; seekerOnly?: boolean }[] = [
    { key: 'jobs',       label: 'الوظائف' },
    { key: 'applicants', label: 'المتقدمون', adminOnly: true },
    { key: 'my-cv',      label: 'سيرتي الذاتية', seekerOnly: false },
    { key: 'my-apps',    label: 'طلباتي' },
    { key: 'add-member', label: 'إضافة موظف', adminOnly: true },
  ];

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-dark-bg-900/90 backdrop-blur-xl border-b border-white/8 px-4 py-3" dir="rtl">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/workspace" className="p-2 -mr-2 rounded-full hover:bg-white/5 text-white/60">
            <ArrowRight size={18} />
          </Link>
          <h1 className="text-white font-black text-[17px] flex-1">التوظيف</h1>
          {isAdmin && view === 'jobs' && (
            <button onClick={() => setShowNewJob(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(20,224,164,0.15)', border: '1px solid rgba(20,224,164,0.35)', color: '#14E0A4' }}>
              <Plus size={14} /> وظيفة جديدة
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto">
          {VIEWS.filter(v => !(v.adminOnly && !isAdmin)).map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                view === v.key
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-white/40 hover:text-white/70'
              }`}>
              {v.label}
              {v.key === 'applicants' && applicants.length > 0 && (
                <span className="mr-1.5 bg-primary/30 text-primary text-[9px] px-1.5 py-0.5 rounded-full font-black">
                  {applicants.length}
                </span>
              )}
              {v.key === 'my-apps' && myApps.length > 0 && (
                <span className="mr-1.5 bg-white/10 text-white/50 text-[9px] px-1.5 py-0.5 rounded-full font-black">
                  {myApps.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ── New Job Modal ─────────────────────────────────────────── */}
      {showNewJob && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4" dir="rtl">
          <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ background: 'rgba(12,16,28,0.99)', border: '1px solid rgba(20,224,164,0.3)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-black text-lg">نشر وظيفة جديدة</h2>
              <button onClick={() => setShowNewJob(false)}><X size={20} className="text-white/40" /></button>
            </div>
            <div className="space-y-3 mb-5">
              <input autoFocus value={jTitle} onChange={e => setJTitle(e.target.value)}
                placeholder="المسمى الوظيفي *"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-500/50 text-sm" />
              <div className="flex gap-2">
                <input value={jLocation} onChange={e => setJLocation(e.target.value)} placeholder="الموقع"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-500/50 text-sm" />
                <input value={jSalary} onChange={e => setJSalary(e.target.value)} placeholder="الراتب"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-500/50 text-sm" />
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(JOB_TYPE_LABEL).map(([k, l]) => (
                  <button key={k} onClick={() => setJType(k)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: jType === k ? 'rgba(20,224,164,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${jType === k ? '#14E0A4' : 'rgba(255,255,255,0.08)'}`,
                      color: jType === k ? '#14E0A4' : 'rgba(255,255,255,0.4)',
                    }}>{l}</button>
                ))}
              </div>
              <input value={jMinExp} onChange={e => setJMinExp(e.target.value)} type="number" placeholder="أقل سنوات خبرة"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-500/50 text-sm" />
              <textarea rows={4} value={jDesc} onChange={e => setJDesc(e.target.value)}
                placeholder="وصف الوظيفة والمتطلبات..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-500/50 text-sm resize-none" />
            </div>
            <button onClick={createJob} disabled={jSaving || !jTitle.trim()}
              className="w-full py-3 rounded-xl text-black font-black disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)' }}>
              {jSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              نشر الوظيفة
            </button>
          </div>
        </div>
      )}

      {/* ── Apply Modal ─────────────────────────────────────────────── */}
      {applyJobId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4" dir="rtl">
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: 'rgba(12,16,28,0.99)', border: '1px solid rgba(0,212,255,0.3)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-black text-lg">تقديم على الوظيفة</h2>
              <button onClick={() => setApplyJobId(null)}><X size={20} className="text-white/40" /></button>
            </div>
            <p className="text-white/50 text-sm mb-3">
              سيتم إرفاق سيرتك الذاتية تلقائياً مع طلبك.
            </p>
            <textarea rows={4} value={coverLetter} onChange={e => setCoverLetter(e.target.value)}
              placeholder="رسالة تعريفية (اختياري) — لماذا أنت مناسب لهذه الوظيفة؟"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm resize-none mb-4" />
            <button onClick={applyToJob} disabled={applying}
              className="w-full py-3 rounded-xl text-white font-black disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(90deg,#00D4FF,#2E8BFF)' }}>
              {applying ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              إرسال الطلب
            </button>
          </div>
        </div>
      )}

      {/* ── CV Modal (for admins viewing applicant CV) ───────────────── */}
      {openCvId && cvCache[openCvId] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" dir="rtl">
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ background: 'rgba(12,16,28,0.99)', border: '1px solid rgba(139,92,246,0.3)' }}>
            {(() => {
              const c = cvCache[openCvId];
              return (
                <>
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h2 className="text-white font-black text-xl">{c.full_name || 'مجهول'}</h2>
                      {c.title && <p className="text-primary text-sm font-bold mt-0.5">{c.title}</p>}
                    </div>
                    <button onClick={() => setOpenCvId(null)}><X size={20} className="text-white/40" /></button>
                  </div>

                  <div className="space-y-4">
                    {/* Contact */}
                    <div className="flex flex-wrap gap-3 text-xs text-white/50">
                      {c.location && <span className="flex items-center gap-1"><MapPin size={11} />{c.location}</span>}
                      {c.phone && <span className="flex items-center gap-1"><Phone size={11} />{c.phone}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail size={11} />{c.email}</span>}
                      {c.years_experience != null && <span className="flex items-center gap-1"><Clock size={11} />{c.years_experience} سنوات خبرة</span>}
                    </div>

                    {c.summary && (
                      <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                        <p className="text-white/60 text-sm leading-relaxed">{c.summary}</p>
                      </div>
                    )}

                    {c.skills && c.skills.length > 0 && (
                      <div>
                        <p className="text-white/40 text-xs font-bold mb-2 flex items-center gap-1"><Star size={10} /> المهارات</p>
                        <div className="flex flex-wrap gap-1.5">
                          {c.skills.map((s, i) => <Tag key={i} color="#2E8BFF">{s}</Tag>)}
                        </div>
                      </div>
                    )}

                    {c.languages && c.languages.length > 0 && (
                      <div>
                        <p className="text-white/40 text-xs font-bold mb-2 flex items-center gap-1"><Globe size={10} /> اللغات</p>
                        <div className="flex flex-wrap gap-1.5">
                          {c.languages.map((l, i) => <Tag key={i} color="#14E0A4">{l}</Tag>)}
                        </div>
                      </div>
                    )}

                    {c.education && c.education.length > 0 && (
                      <div>
                        <p className="text-white/40 text-xs font-bold mb-2 flex items-center gap-1"><BookOpen size={10} /> التعليم</p>
                        {c.education.map((e, i) => (
                          <p key={i} className="text-white/60 text-sm">· {e}</p>
                        ))}
                      </div>
                    )}

                    {c.certifications && c.certifications.length > 0 && (
                      <div>
                        <p className="text-white/40 text-xs font-bold mb-2">الشهادات</p>
                        {c.certifications.map((cert, i) => (
                          <p key={i} className="text-white/60 text-sm">· {cert}</p>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {c.linkedin_url && (
                        <a href={c.linkedin_url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                          style={{ background: 'rgba(10,102,194,0.15)', border: '1px solid rgba(10,102,194,0.3)', color: '#0A66C2' }}>
                          <Linkedin size={12} /> LinkedIn
                        </a>
                      )}
                      {c.portfolio_url && (
                        <a href={c.portfolio_url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                          style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#8B5CF6' }}>
                          <ExternalLink size={12} /> Portfolio
                        </a>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-primary animate-spin" />
        </div>
      ) : (
        <div className="px-4 py-4 pb-24 md:pb-10" dir="rtl">

          {/* ══════════════════════════════════════════════════════════
              VIEW: الوظائف
          ══════════════════════════════════════════════════════════ */}
          {view === 'jobs' && (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input value={jobSearch} onChange={e => setJobSearch(e.target.value)}
                  placeholder="ابحث عن وظيفة..."
                  className="w-full bg-white/5 border border-white/8 rounded-xl py-3 pr-10 pl-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/40" />
              </div>

              {filteredJobs.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
                    <Briefcase size={28} className="text-accent-500" />
                  </div>
                  <p className="text-white/50 font-bold mb-1">لا يوجد وظائف منشورة</p>
                  {isAdmin && (
                    <button onClick={() => setShowNewJob(true)}
                      className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold text-accent-500"
                      style={{ background: 'rgba(20,224,164,0.1)', border: '1px solid rgba(20,224,164,0.25)' }}>
                      انشر أول وظيفة
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredJobs.map(job => (
                    <div key={job.id} className="rounded-2xl border border-white/6 bg-white/[0.02] overflow-hidden hover:border-white/10 transition-all">
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(20,224,164,0.12)', border: '1px solid rgba(20,224,164,0.2)' }}>
                            <Briefcase size={18} style={{ color: '#14E0A4' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm">{job.title}</p>
                            {job.company_name && <p className="text-primary/80 text-xs mt-0.5">{job.company_name}</p>}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {job.location && <Tag color="#8B5CF6">{job.location}</Tag>}
                              {job.job_type && <Tag color="#2E8BFF">{JOB_TYPE_LABEL[job.job_type] || job.job_type}</Tag>}
                              {job.salary_range && <Tag color="#FFB24D">{job.salary_range}</Tag>}
                              {job.min_experience != null && <Tag color="#6B7280">{String(job.min_experience)}+ سنوات</Tag>}
                            </div>
                          </div>
                          {job.applications_count != null && job.applications_count > 0 && (
                            <div className="flex items-center gap-1 text-white/30 text-[11px]">
                              <Users size={11} />
                              <span>{job.applications_count}</span>
                            </div>
                          )}
                        </div>

                        {job.description && (
                          <p className="text-white/40 text-xs mt-3 line-clamp-2 leading-relaxed">
                            {job.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-3">
                          {job.applied_by_me ? (
                            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-1 justify-center"
                              style={{ background: 'rgba(20,224,164,0.1)', border: '1px solid rgba(20,224,164,0.2)', color: '#14E0A4' }}>
                              <CheckCircle2 size={13} /> تم التقديم
                            </div>
                          ) : (
                            <button onClick={() => setApplyJobId(job.id)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold flex-1 justify-center transition-all hover:opacity-90"
                              style={{ background: 'linear-gradient(90deg,#00D4FF,#2E8BFF)', color: '#fff' }}>
                              <Send size={13} /> تقديم على الوظيفة
                            </button>
                          )}
                          <button onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                            className="p-2 rounded-xl text-white/30 hover:bg-white/5 transition-all">
                            {expandedJob === job.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {expandedJob === job.id && job.description && (
                        <div className="border-t border-white/5 px-4 py-3">
                          <p className="text-white/50 text-xs leading-relaxed">{job.description}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════════
              VIEW: المتقدمون (admin only)
          ══════════════════════════════════════════════════════════ */}
          {view === 'applicants' && isAdmin && (
            <>
              <div className="mb-4 flex items-center gap-2">
                <p className="text-white/40 text-sm">
                  <span className="text-white font-bold">{applicants.length}</span> متقدم على وظائف شركتك
                </p>
              </div>

              {applicants.length === 0 ? (
                <div className="text-center py-16">
                  <Users size={32} className="text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 font-bold">لم يتقدم أحد بعد</p>
                  <p className="text-white/25 text-sm mt-1">انشر وظائف لاستقطاب المتقدمين</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {applicants.map(app => {
                    const sm = STATUS_META[app.status] ?? { label: app.status, color: '#888' };
                    return (
                      <div key={app.id} className="rounded-2xl border border-white/6 bg-white/[0.02] p-4 hover:border-white/10 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-base font-black"
                            style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', color: '#8B5CF6' }}>
                            {(app.applicant_name || app.applicant_username || '?').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white font-bold text-sm">{app.applicant_name || app.applicant_username}</p>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: `${sm.color}18`, color: sm.color }}>
                                {sm.label}
                              </span>
                            </div>
                            <p className="text-white/40 text-xs mt-0.5">تقدم على: <span className="text-white/60">{app.job_title}</span></p>
                            {app.created_at && (
                              <p className="text-white/25 text-[10px] mt-0.5">{new Date(app.created_at).toLocaleDateString('ar-SA')}</p>
                            )}
                            {app.cover_letter && (
                              <p className="text-white/40 text-xs mt-2 line-clamp-2 leading-relaxed border-r-2 border-white/10 pr-2">
                                {app.cover_letter}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <button onClick={() => loadCv(app.applicant_id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                            style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#8B5CF6' }}>
                            <FileText size={12} /> السيرة الذاتية
                          </button>

                          {app.status === 'pending' && (
                            <>
                              <button onClick={() => updateAppStatus(app.id, app.job_id, 'accepted')}
                                disabled={updatingApp === app.id}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-40"
                                style={{ background: 'rgba(20,224,164,0.12)', border: '1px solid rgba(20,224,164,0.25)', color: '#14E0A4' }}>
                                {updatingApp === app.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                                قبول
                              </button>
                              <button onClick={() => updateAppStatus(app.id, app.job_id, 'rejected')}
                                disabled={updatingApp === app.id}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-40"
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                                <XCircle size={11} /> رفض
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════════
              VIEW: سيرتي الذاتية (CV builder)
          ══════════════════════════════════════════════════════════ */}
          {view === 'my-cv' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-white/8 bg-white/[0.02]">
                <p className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                  <FileText size={15} className="text-primary" /> المعلومات الأساسية
                </p>
                <div className="space-y-3">
                  <input value={cv.full_name || ''} onChange={e => setCv(p => ({ ...p, full_name: e.target.value }))}
                    placeholder="الاسم الكامل"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                  <input value={cv.title || ''} onChange={e => setCv(p => ({ ...p, title: e.target.value }))}
                    placeholder="المسمى الوظيفي (مثال: مطور برمجيات)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                  <textarea rows={3} value={cv.summary || ''} onChange={e => setCv(p => ({ ...p, summary: e.target.value }))}
                    placeholder="نبذة مختصرة عن نفسك وخبراتك..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm resize-none" />
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-white/8 bg-white/[0.02]">
                <p className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                  <Phone size={15} className="text-accent-500" /> معلومات التواصل
                </p>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input value={cv.phone || ''} onChange={e => setCv(p => ({ ...p, phone: e.target.value }))}
                      placeholder="رقم الهاتف"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                    <input value={cv.email || ''} onChange={e => setCv(p => ({ ...p, email: e.target.value }))}
                      placeholder="البريد الإلكتروني"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                  </div>
                  <input value={cv.location || ''} onChange={e => setCv(p => ({ ...p, location: e.target.value }))}
                    placeholder="الموقع (المدينة، الدولة)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                  <input type="number" value={cv.years_experience ?? ''} onChange={e => setCv(p => ({ ...p, years_experience: Number(e.target.value) || undefined }))}
                    placeholder="سنوات الخبرة"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-white/8 bg-white/[0.02]">
                <p className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                  <Star size={15} className="text-yellow-400" /> المهارات
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(cv.skills || []).map((s, i) => (
                    <button key={i} onClick={() => setCv(p => ({ ...p, skills: (p.skills || []).filter((_, idx) => idx !== i) }))}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: 'rgba(46,139,255,0.15)', color: '#2E8BFF', border: '1px solid rgba(46,139,255,0.3)' }}>
                      {s} <X size={9} />
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSkill()}
                    placeholder="أضف مهارة (Enter)"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                  <button onClick={addSkill} className="px-4 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: 'rgba(46,139,255,0.15)', border: '1px solid rgba(46,139,255,0.3)', color: '#2E8BFF' }}>
                    إضافة
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-white/8 bg-white/[0.02]">
                <p className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                  <Globe size={15} className="text-accent-500" /> اللغات
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(cv.languages || []).map((l, i) => (
                    <button key={i} onClick={() => setCv(p => ({ ...p, languages: (p.languages || []).filter((_, idx) => idx !== i) }))}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: 'rgba(20,224,164,0.15)', color: '#14E0A4', border: '1px solid rgba(20,224,164,0.3)' }}>
                      {l} <X size={9} />
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={langInput} onChange={e => setLangInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addLang()}
                    placeholder="مثال: العربية، الإنجليزية"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                  <button onClick={addLang} className="px-4 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: 'rgba(20,224,164,0.15)', border: '1px solid rgba(20,224,164,0.3)', color: '#14E0A4' }}>
                    إضافة
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-white/8 bg-white/[0.02]">
                <p className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                  <Linkedin size={15} style={{ color: '#0A66C2' }} /> الروابط المهنية
                </p>
                <div className="space-y-3">
                  <input value={cv.linkedin_url || ''} onChange={e => setCv(p => ({ ...p, linkedin_url: e.target.value }))}
                    placeholder="رابط LinkedIn"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                  <input value={cv.portfolio_url || ''} onChange={e => setCv(p => ({ ...p, portfolio_url: e.target.value }))}
                    placeholder="رابط Portfolio أو موقعك الشخصي"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                </div>
              </div>

              {cvMsg && (
                <p className={`text-sm font-bold text-center ${cvMsg.includes('✓') ? 'text-accent-500' : 'text-red-400'}`}>{cvMsg}</p>
              )}

              <button onClick={saveCV} disabled={cvSaving}
                className="w-full py-3.5 rounded-xl text-white font-black disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(90deg,#00D4FF,#2E8BFF)' }}>
                {cvSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                حفظ السيرة الذاتية
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              VIEW: طلباتي
          ══════════════════════════════════════════════════════════ */}
          {view === 'my-apps' && (
            <>
              {myApps.length === 0 ? (
                <div className="text-center py-16">
                  <FileText size={32} className="text-white/20 mx-auto mb-3" />
                  <p className="text-white/50 font-bold">لم تتقدم على أي وظيفة بعد</p>
                  <button onClick={() => setView('jobs')}
                    className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.25)', color: '#00D4FF' }}>
                    تصفح الوظائف
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myApps.map(app => {
                    const sm = STATUS_META[app.status] ?? { label: app.status, color: '#888' };
                    return (
                      <div key={app.id} className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-white font-bold text-sm">{app.job_title}</p>
                            {app.company_name && <p className="text-primary/70 text-xs mt-0.5">{app.company_name}</p>}
                            {app.created_at && (
                              <p className="text-white/30 text-[10px] mt-1 flex items-center gap-1">
                                <Clock size={9} /> {new Date(app.created_at).toLocaleDateString('ar-SA')}
                              </p>
                            )}
                          </div>
                          <span className="text-[11px] font-bold px-3 py-1 rounded-full flex-shrink-0"
                            style={{ background: `${sm.color}18`, color: sm.color, border: `1px solid ${sm.color}30` }}>
                            {sm.label}
                          </span>
                        </div>
                        {app.cover_letter && (
                          <p className="text-white/30 text-xs mt-3 line-clamp-2 border-r-2 border-white/8 pr-2">
                            {app.cover_letter}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          VIEW: إضافة موظف — admin only
      ══════════════════════════════════════════════════════════════ */}
      {view === 'add-member' && isAdmin && (
        <div className="px-4 py-5 pb-24 md:pb-10 space-y-5" dir="rtl">

          {/* ── Method toggle ── */}
          <div className="flex gap-2">
            {([
              { k: 'email', label: 'بالبريد الإلكتروني', icon: <Mail size={13}/> },
              { k: 'icode', label: 'بالرمز التعريفي',    icon: <Hash size={13}/> },
            ] as const).map(m => (
              <button key={m.k} onClick={() => { setAddMethod(m.k); setAddMsg(null); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: addMethod === m.k ? 'rgba(20,224,164,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${addMethod === m.k ? '#14E0A4' : 'rgba(255,255,255,0.08)'}`,
                  color: addMethod === m.k ? '#14E0A4' : 'rgba(255,255,255,0.35)',
                }}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {/* ── Form card ── */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 space-y-4">

            {addMethod === 'email' ? (
              <>
                <div>
                  <label className="text-white/40 text-xs mb-2 block">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail size={14} className="absolute right-3 top-3.5 text-white/25 pointer-events-none" />
                    <input
                      value={addEmail} onChange={e => setAddEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddByEmail()}
                      type="email" placeholder="employee@company.com" dir="ltr"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-9 pl-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40"
                    />
                  </div>
                  <p className="text-white/25 text-[11px] mt-1.5">
                    سيصله بريد إلكتروني لقبول الدعوة خلال 72 ساعة
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-white/40 text-xs mb-2 block">الرمز التعريفي (I.code)</label>
                  <div className="relative">
                    <Hash size={14} className="absolute right-3 top-3.5 text-white/25 pointer-events-none" />
                    <input
                      value={addIcode} onChange={e => setAddIcode(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && handleAddByIcode()}
                      placeholder="مثال: A7X2K9" dir="ltr" maxLength={12}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-9 pl-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 tracking-widest font-mono"
                    />
                  </div>
                  <p className="text-white/25 text-[11px] mt-1.5">
                    الرمز موجود في ملف الموظف داخل المنصة (I.code)
                  </p>
                </div>
              </>
            )}

            {/* Role selector */}
            <div>
              <label className="text-white/40 text-xs mb-2 block">الدور الوظيفي</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { k: 'employee', l: 'موظف',  c: '#2E8BFF' },
                  { k: 'manager',  l: 'مدير',   c: '#8B5CF6' },
                  { k: 'admin',    l: 'مشرف',   c: '#EF4444' },
                ].map(r => (
                  <button key={r.k} onClick={() => setAddRole(r.k)}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: addRole === r.k ? `${r.c}18` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${addRole === r.k ? `${r.c}50` : 'rgba(255,255,255,0.08)'}`,
                      color: addRole === r.k ? r.c : 'rgba(255,255,255,0.35)',
                    }}>
                    {r.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            {addMsg && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold ${
                addMsg.ok
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                {addMsg.ok ? <CheckCheck size={15}/> : <XCircle size={15}/>}
                {addMsg.text}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={addMethod === 'email' ? handleAddByEmail : handleAddByIcode}
              disabled={addLoading || (addMethod === 'email' ? !addEmail.trim() : !addIcode.trim())}
              className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)', color: '#050810' }}
            >
              {addLoading
                ? <Loader2 size={16} className="animate-spin"/>
                : <><UserPlus size={16}/> إرسال الدعوة</>
              }
            </button>
          </div>

          {/* ── Invite link ── */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Link2 size={15} className="text-primary" />
                <span className="text-white font-bold text-sm">رابط الدعوة المباشر</span>
              </div>
              <button
                onClick={loadInviteLink}
                disabled={linkLoading}
                className="text-white/30 hover:text-white/60 transition-colors"
              >
                <RefreshCw size={14} className={linkLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            <p className="text-white/30 text-xs mb-3">
              أي شخص عنده هذا الرابط يقدر ينضم لشركتك مباشرة كموظف
            </p>
            {inviteLink ? (
              <div className="flex gap-2">
                <div
                  className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white/50 font-mono truncate"
                  dir="ltr"
                >
                  {inviteLink}
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(inviteLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all flex-shrink-0"
                  style={{
                    background: linkCopied ? 'rgba(20,224,164,0.15)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${linkCopied ? '#14E0A4' : 'rgba(255,255,255,0.1)'}`,
                    color: linkCopied ? '#14E0A4' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {linkCopied ? <><CheckCheck size={12}/> تم</> : <><Copy size={12}/> نسخ</>}
                </button>
              </div>
            ) : (
              <button
                onClick={loadInviteLink}
                disabled={linkLoading}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white/40 border border-white/8 hover:border-white/15 transition-all flex items-center justify-center gap-2"
              >
                {linkLoading ? <Loader2 size={13} className="animate-spin"/> : <Link2 size={13}/>}
                توليد رابط الدعوة
              </button>
            )}
          </div>

          {/* ── Instructions ── */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.015] p-5 space-y-3">
            <p className="text-white/50 text-xs font-bold mb-1">كيفية الإضافة</p>
            {[
              { n: '١', t: 'بالبريد الإلكتروني', d: 'يصل الموظف دعوة على بريده ويضغط قبول — يشتغل حتى لو ما عنده حساب' },
              { n: '٢', t: 'بالرمز التعريفي',    d: 'الموظف يشاركك الـ I.code من ملفه الشخصي — يُضاف فوراً بعد قبوله' },
              { n: '٣', t: 'رابط الدعوة',        d: 'شارك الرابط مع أي شخص — ينضم مباشرة كموظف بدون خطوات إضافية' },
            ].map(i => (
              <div key={i.n} className="flex gap-3">
                <span
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(20,224,164,0.1)', color: '#14E0A4' }}
                >
                  {i.n}
                </span>
                <div>
                  <p className="text-white/70 text-xs font-bold">{i.t}</p>
                  <p className="text-white/30 text-[11px] mt-0.5">{i.d}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </AppShell>
  );
}
