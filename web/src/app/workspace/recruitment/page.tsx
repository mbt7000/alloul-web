'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase, Users, Plus, X, Loader2, ChevronDown, ChevronUp,
  Check, XCircle, FileText, Star, Globe, MapPin, Phone, Mail,
  Linkedin, ExternalLink, Clock, BarChart3, UserCheck,
  Search, Hash, Link2, Copy, CheckCheck, RefreshCw,
  BookOpen, UserPlus, Building2, TrendingUp, Filter,
  ArrowRight, Edit2, Trash2, Eye, Send,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { apiFetch, ApiError } from '@/lib/api-client';
import { isAuthenticated, clearToken } from '@/lib/auth';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Job {
  id: number; title: string; job_type?: string; location?: string;
  description?: string; requirements?: string; salary_range?: string;
  min_experience?: number; is_active: boolean; applications_count: number;
  created_at?: string;
}

interface Applicant {
  id: number; job_id: number; job_title?: string;
  applicant_id: number; applicant_name?: string; applicant_username?: string;
  applicant_avatar?: string; cover_letter?: string;
  status: string; stage?: string; rating?: number; internal_note?: string;
  created_at?: string;
  cv?: {
    full_name?: string; title?: string; summary?: string; phone?: string;
    email?: string; location?: string; years_experience?: number;
    skills?: string[]; languages?: string[]; education?: string[];
    certifications?: string[]; linkedin_url?: string; portfolio_url?: string;
  } | null;
}

interface Dashboard {
  open_jobs: number; total_applicants: number; new_this_week: number;
  hired: number; pending_review: number;
  stages: Record<string, number>;
}

interface TalentProfile {
  user_id: number; name?: string; username: string; avatar_url?: string;
  title?: string; location?: string; years_experience?: number;
  skills?: string[]; summary?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const JOB_TYPE_LABEL: Record<string, string> = {
  full_time: 'دوام كامل', part_time: 'دوام جزئي',
  contract: 'عقد مؤقت', internship: 'تدريب', remote: 'عن بُعد',
};

const STAGE_META: Record<string, { label: string; color: string }> = {
  applied:    { label: 'تقديم جديد',   color: '#2E8BFF' },
  screening:  { label: 'مراجعة أولية', color: '#F59E0B' },
  interview:  { label: 'مقابلة',       color: '#A78BFA' },
  offer:      { label: 'عرض عمل',      color: '#14E0A4' },
  hired:      { label: 'تم التوظيف',   color: '#10B981' },
  rejected:   { label: 'مرفوض',        color: '#EF4444' },
  withdrawn:  { label: 'انسحب',        color: '#6B7280' },
  pending:    { label: 'قيد المراجعة', color: '#F59E0B' },
  reviewed:   { label: 'تمت المراجعة', color: '#2E8BFF' },
  accepted:   { label: 'مقبول',        color: '#14E0A4' },
};

const STAGES_ORDER = ['applied','screening','interview','offer','hired','rejected','withdrawn'];

function Tag({ children, color = '#2E8BFF' }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {children}
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'jobs' | 'applicants' | 'talent' | 'direct-hire';

export default function RecruitmentPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Dashboard
  const [dash, setDash] = useState<Dashboard | null>(null);

  // Jobs
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showNewJob, setShowNewJob] = useState(false);
  const [expandedJob, setExpandedJob] = useState<number | null>(null);
  const [jTitle, setJTitle] = useState(''); const [jType, setJType] = useState('full_time');
  const [jLoc, setJLoc] = useState(''); const [jSalary, setJSalary] = useState('');
  const [jDesc, setJDesc] = useState(''); const [jReq, setJReq] = useState('');
  const [jExp, setJExp] = useState(''); const [jSaving, setJSaving] = useState(false);

  // Applicants
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedJob, setSelectedJob] = useState<number | 'all'>('all');
  const [openCv, setOpenCv] = useState<Applicant | null>(null);
  const [updatingApp, setUpdatingApp] = useState<number | null>(null);
  const [stageFilter, setStageFilter] = useState<string>('all');

  // Talent pool
  const [talent, setTalent] = useState<TalentProfile[]>([]);
  const [talentSearch, setTalentSearch] = useState('');
  const [talentLoading, setTalentLoading] = useState(false);

  // Direct hire
  const [dhMethod, setDhMethod] = useState<'email' | 'icode'>('email');
  const [dhEmail, setDhEmail] = useState(''); const [dhIcode, setDhIcode] = useState('');
  const [dhRole, setDhRole] = useState('employee');
  const [dhLoading, setDhLoading] = useState(false);
  const [dhMsg, setDhMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    loadAll();
  }, [router]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [dashRes, jobsRes] = await Promise.allSettled([
        apiFetch<Dashboard>('/workspace/recruitment/dashboard'),
        apiFetch<Job[]>('/workspace/recruitment/jobs'),
      ]);

      if (dashRes.status === 'fulfilled') { setDash(dashRes.value); setIsAdmin(true); }
      else { setIsAdmin(false); }

      if (jobsRes.status === 'fulfilled') {
        const jobList = Array.isArray(jobsRes.value) ? jobsRes.value : [];
        setJobs(jobList);
        // Load applicants for all active jobs
        const appResults = await Promise.allSettled(
          jobList.map(j => apiFetch<Applicant[]>(`/workspace/recruitment/jobs/${j.id}/applicants`))
        );
        const all: Applicant[] = [];
        appResults.forEach(r => { if (r.status === 'fulfilled' && Array.isArray(r.value)) all.push(...r.value); });
        setApplicants(all);
      }
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) { clearToken(); router.replace('/login'); }
    } finally { setLoading(false); }
  };

  const loadTalent = async (search = '') => {
    setTalentLoading(true);
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await apiFetch<TalentProfile[]>(`/workspace/recruitment/talent-pool${q}`);
      setTalent(Array.isArray(data) ? data : []);
    } catch {} finally { setTalentLoading(false); }
  };

  useEffect(() => { if (tab === 'talent') loadTalent(); }, [tab]);

  const createJob = async () => {
    if (!jTitle.trim()) return;
    setJSaving(true);
    try {
      const j = await apiFetch<Job>('/workspace/recruitment/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title: jTitle.trim(), job_type: jType,
          location: jLoc || undefined, salary_range: jSalary || undefined,
          description: jDesc || undefined, requirements: jReq || undefined,
          min_experience: jExp ? parseInt(jExp) : undefined,
        }),
      });
      setJobs(prev => [j, ...prev]);
      setShowNewJob(false);
      setJTitle(''); setJType('full_time'); setJLoc(''); setJSalary(''); setJDesc(''); setJReq(''); setJExp('');
      setDash(prev => prev ? { ...prev, open_jobs: prev.open_jobs + 1 } : prev);
    } catch {} finally { setJSaving(false); }
  };

  const closeJob = async (jobId: number) => {
    try {
      await apiFetch(`/workspace/recruitment/jobs/${jobId}`, { method: 'DELETE' });
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, is_active: false } : j));
    } catch {}
  };

  const updateStage = async (appId: number, stage: string) => {
    setUpdatingApp(appId);
    try {
      await apiFetch(`/workspace/recruitment/applications/${appId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage }),
      });
      setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status: stage, stage } : a));
      if (openCv?.id === appId) setOpenCv(prev => prev ? { ...prev, status: stage, stage } : prev);
    } catch {} finally { setUpdatingApp(null); }
  };

  const sendInvite = async () => {
    const val = dhMethod === 'email' ? dhEmail.trim() : dhIcode.trim();
    if (!val) return;
    setDhLoading(true); setDhMsg(null);
    try {
      const endpoint = dhMethod === 'email' ? '/companies/invite-email' : '/companies/invite';
      const body = dhMethod === 'email'
        ? { email: val, role: dhRole }
        : { i_code: val, role: dhRole };
      await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
      setDhMsg({ ok: true, text: dhMethod === 'email' ? `تم إرسال الدعوة إلى ${val}` : 'تم إرسال الدعوة — سيصله إشعار لقبولها' });
      dhMethod === 'email' ? setDhEmail('') : setDhIcode('');
    } catch (e: any) {
      setDhMsg({ ok: false, text: e?.detail || e?.message || 'فشل إرسال الدعوة' });
    } finally { setDhLoading(false); }
  };

  const loadLink = async () => {
    setLinkLoading(true);
    try {
      const data = await apiFetch('/companies/invite-link');
      const base = 'https://alloul.app';
      setInviteLink(`${base}/join?code=${data.invite_code}`);
    } catch {} finally { setLinkLoading(false); }
  };

  useEffect(() => { if (tab === 'direct-hire' && !inviteLink) loadLink(); }, [tab]);

  // ── filtered applicants ────────────────────────────────────────────────────
  const filteredApps = applicants.filter(a => {
    if (selectedJob !== 'all' && a.job_id !== selectedJob) return false;
    if (stageFilter !== 'all' && a.status !== stageFilter && a.stage !== stageFilter) return false;
    return true;
  });

  if (loading) return (
    <AppShell>
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={28} className="text-primary animate-spin" />
      </div>
    </AppShell>
  );

  if (!isAdmin) return (
    <AppShell>
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6" dir="rtl">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <XCircle size={28} className="text-red-400" />
        </div>
        <p className="text-white font-black text-lg">صلاحيات غير كافية</p>
        <p className="text-white/40 text-sm text-center">هذه الصفحة مخصصة لمسؤولي الشركة فقط</p>
        <button onClick={() => router.push('/workspace')}
          className="px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: 'rgba(20,224,164,0.1)', color: '#14E0A4', border: '1px solid rgba(20,224,164,0.25)' }}>
          العودة للورك سبيس
        </button>
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl border-b border-white/6 px-4 py-3" style={{ background: 'rgba(7,11,20,0.9)' }} dir="rtl">
        <div className="flex items-center gap-3 mb-3">
          <Briefcase size={18} style={{ color: '#14E0A4' }} />
          <h1 className="text-white font-black text-[17px] flex-1">إدارة التوظيف</h1>
          {tab === 'jobs' && (
            <button onClick={() => setShowNewJob(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black"
              style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)', color: '#050810' }}>
              <Plus size={13} /> نشر وظيفة
            </button>
          )}
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {([
            { key: 'dashboard',   label: 'الإحصائيات',    icon: <BarChart3 size={13}/> },
            { key: 'jobs',        label: 'الوظائف',        icon: <Briefcase size={13}/> },
            { key: 'applicants',  label: 'المتقدمون',      icon: <Users size={13}/>, badge: applicants.filter(a => a.status === 'applied' || a.status === 'pending').length },
            { key: 'talent',      label: 'قاعدة المواهب', icon: <Star size={13}/> },
            { key: 'direct-hire', label: 'توظيف مباشر',   icon: <UserPlus size={13}/> },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key as Tab)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: tab === t.key ? 'rgba(20,224,164,0.12)' : 'transparent',
                border: `1px solid ${tab === t.key ? 'rgba(20,224,164,0.35)' : 'transparent'}`,
                color: tab === t.key ? '#14E0A4' : 'rgba(255,255,255,0.4)',
              }}>
              {t.icon} {t.label}
              {'badge' in t && t.badge > 0 && (
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
                  style={{ background: '#14E0A4', color: '#050810' }}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-5 pb-24 md:pb-10" dir="rtl">

        {/* ══════════════ DASHBOARD ══════════════ */}
        {tab === 'dashboard' && dash && (
          <div className="space-y-5">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'وظائف مفتوحة',     value: dash.open_jobs,        color: '#14E0A4', icon: <Briefcase size={18}/> },
                { label: 'إجمالي المتقدمين', value: dash.total_applicants, color: '#2E8BFF', icon: <Users size={18}/> },
                { label: 'جدد هذا الأسبوع', value: dash.new_this_week,    color: '#F59E0B', icon: <TrendingUp size={18}/> },
                { label: 'تم توظيفهم',       value: dash.hired,            color: '#10B981', icon: <UserCheck size={18}/> },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-4" style={{ background: `${s.color}09`, border: `1px solid ${s.color}20` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ color: s.color }}>{s.icon}</span>
                    <span className="text-2xl font-black text-white">{s.value}</span>
                  </div>
                  <p className="text-white/40 text-xs font-bold">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Pipeline stages */}
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-white font-black text-sm mb-4 flex items-center gap-2">
                <Filter size={14} className="text-primary" /> خط سير الطلبات
              </p>
              <div className="space-y-2.5">
                {STAGES_ORDER.map(s => {
                  const meta = STAGE_META[s];
                  const count = dash.stages?.[s] || 0;
                  const max = Math.max(...Object.values(dash.stages || {}), 1);
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <span className="text-xs font-bold w-24 text-right flex-shrink-0" style={{ color: meta.color }}>{meta.label}</span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${(count / max) * 100}%`, background: meta.color }} />
                      </div>
                      <span className="text-white/50 text-xs font-bold w-4 text-center">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setTab('jobs')}
                className="p-4 rounded-2xl text-right transition-all hover:brightness-110"
                style={{ background: 'rgba(20,224,164,0.08)', border: '1px solid rgba(20,224,164,0.2)' }}>
                <Briefcase size={20} style={{ color: '#14E0A4' }} className="mb-2" />
                <p className="text-white font-bold text-sm">إدارة الوظائف</p>
                <p className="text-white/30 text-[11px]">{jobs.filter(j => j.is_active).length} وظيفة مفتوحة</p>
              </button>
              <button onClick={() => setTab('applicants')}
                className="p-4 rounded-2xl text-right transition-all hover:brightness-110"
                style={{ background: 'rgba(46,139,255,0.08)', border: '1px solid rgba(46,139,255,0.2)' }}>
                <Users size={20} style={{ color: '#2E8BFF' }} className="mb-2" />
                <p className="text-white font-bold text-sm">مراجعة المتقدمين</p>
                <p className="text-white/30 text-[11px]">{dash.pending_review} بانتظار المراجعة</p>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ JOBS ══════════════ */}
        {tab === 'jobs' && (
          <div className="space-y-3">
            {/* New job modal */}
            {showNewJob && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'rgba(12,16,28,0.99)', border: '1px solid rgba(20,224,164,0.3)' }}>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-white font-black text-lg">نشر وظيفة جديدة</h2>
                    <button onClick={() => setShowNewJob(false)}><X size={20} className="text-white/40" /></button>
                  </div>
                  <div className="space-y-3 mb-5">
                    <input autoFocus value={jTitle} onChange={e => setJTitle(e.target.value)} placeholder="المسمى الوظيفي *"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                    <div className="flex gap-2">
                      <input value={jLoc} onChange={e => setJLoc(e.target.value)} placeholder="الموقع"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                      <input value={jSalary} onChange={e => setJSalary(e.target.value)} placeholder="الراتب"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(JOB_TYPE_LABEL).map(([k, l]) => (
                        <button key={k} onClick={() => setJType(k)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={{ background: jType === k ? 'rgba(20,224,164,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${jType === k ? '#14E0A4' : 'rgba(255,255,255,0.08)'}`, color: jType === k ? '#14E0A4' : 'rgba(255,255,255,0.4)' }}>
                          {l}
                        </button>
                      ))}
                    </div>
                    <input value={jExp} onChange={e => setJExp(e.target.value)} type="number" placeholder="أقل سنوات خبرة"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                    <textarea rows={3} value={jDesc} onChange={e => setJDesc(e.target.value)} placeholder="وصف الوظيفة..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm resize-none" />
                    <textarea rows={3} value={jReq} onChange={e => setJReq(e.target.value)} placeholder="المتطلبات والمؤهلات..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm resize-none" />
                  </div>
                  <button onClick={createJob} disabled={jSaving || !jTitle.trim()}
                    className="w-full py-3 rounded-xl text-black font-black disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)' }}>
                    {jSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} نشر الوظيفة
                  </button>
                </div>
              </div>
            )}

            {jobs.length === 0 ? (
              <div className="text-center py-20">
                <Briefcase size={40} className="text-white/15 mx-auto mb-4" />
                <p className="text-white/50 font-bold mb-1">لم تنشر أي وظيفة بعد</p>
                <button onClick={() => setShowNewJob(true)}
                  className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'rgba(20,224,164,0.1)', border: '1px solid rgba(20,224,164,0.25)', color: '#14E0A4' }}>
                  انشر أول وظيفة
                </button>
              </div>
            ) : (
              jobs.map(job => {
                const appCount = applicants.filter(a => a.job_id === job.id).length;
                return (
                  <div key={job.id} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${job.is_active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}` }}>
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: job.is_active ? 'rgba(20,224,164,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${job.is_active ? 'rgba(20,224,164,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
                          <Briefcase size={18} style={{ color: job.is_active ? '#14E0A4' : '#6B7280' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-bold text-sm truncate">{job.title}</p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: job.is_active ? 'rgba(20,224,164,0.12)' : 'rgba(107,114,128,0.12)', color: job.is_active ? '#14E0A4' : '#6B7280' }}>
                              {job.is_active ? 'مفتوحة' : 'مغلقة'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {job.location && <Tag color="#8B5CF6">{job.location}</Tag>}
                            {job.job_type && <Tag color="#2E8BFF">{JOB_TYPE_LABEL[job.job_type] || job.job_type}</Tag>}
                            {job.salary_range && <Tag color="#F59E0B">{job.salary_range}</Tag>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-white/30 text-xs flex-shrink-0">
                          <Users size={12} />
                          <span className="font-bold text-white/60">{appCount}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button onClick={() => { setTab('applicants'); setSelectedJob(job.id); }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-1 justify-center"
                          style={{ background: 'rgba(46,139,255,0.12)', border: '1px solid rgba(46,139,255,0.25)', color: '#2E8BFF' }}>
                          <Eye size={12} /> {appCount} متقدم
                        </button>
                        {job.is_active && (
                          <button onClick={() => closeJob(job.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                            <XCircle size={12} /> إغلاق
                          </button>
                        )}
                        <button onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                          className="p-2 rounded-xl text-white/30 hover:bg-white/5">
                          {expandedJob === job.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </div>
                    </div>
                    {expandedJob === job.id && (job.description || job.requirements) && (
                      <div className="border-t border-white/5 px-4 py-3 space-y-2">
                        {job.description && <p className="text-white/40 text-xs leading-relaxed">{job.description}</p>}
                        {job.requirements && (
                          <div>
                            <p className="text-white/25 text-[10px] font-bold mb-1">المتطلبات</p>
                            <p className="text-white/40 text-xs leading-relaxed">{job.requirements}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ══════════════ APPLICANTS ══════════════ */}
        {tab === 'applicants' && (
          <>
            {/* CV modal */}
            {openCv && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'rgba(10,14,26,0.99)', border: '1px solid rgba(139,92,246,0.3)' }}>
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <p className="text-white font-black text-xl">{openCv.cv?.full_name || openCv.applicant_name || 'مجهول'}</p>
                      {openCv.cv?.title && <p className="text-primary text-sm font-bold mt-0.5">{openCv.cv.title}</p>}
                    </div>
                    <button onClick={() => setOpenCv(null)}><X size={20} className="text-white/40" /></button>
                  </div>

                  {openCv.cv ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-3 text-xs text-white/50">
                        {openCv.cv.location && <span className="flex items-center gap-1"><MapPin size={11}/>{openCv.cv.location}</span>}
                        {openCv.cv.phone && <span className="flex items-center gap-1"><Phone size={11}/>{openCv.cv.phone}</span>}
                        {openCv.cv.email && <span className="flex items-center gap-1"><Mail size={11}/>{openCv.cv.email}</span>}
                        {openCv.cv.years_experience != null && <span className="flex items-center gap-1"><Clock size={11}/>{openCv.cv.years_experience} سنوات خبرة</span>}
                      </div>
                      {openCv.cv.summary && (
                        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                          <p className="text-white/60 text-sm leading-relaxed">{openCv.cv.summary}</p>
                        </div>
                      )}
                      {openCv.cv.skills && openCv.cv.skills.length > 0 && (
                        <div>
                          <p className="text-white/40 text-xs font-bold mb-2">المهارات</p>
                          <div className="flex flex-wrap gap-1.5">{openCv.cv.skills.map((s,i) => <Tag key={i} color="#2E8BFF">{s}</Tag>)}</div>
                        </div>
                      )}
                      {openCv.cv.languages && openCv.cv.languages.length > 0 && (
                        <div>
                          <p className="text-white/40 text-xs font-bold mb-2">اللغات</p>
                          <div className="flex flex-wrap gap-1.5">{openCv.cv.languages.map((l,i) => <Tag key={i} color="#14E0A4">{l}</Tag>)}</div>
                        </div>
                      )}
                      {openCv.cv.education && openCv.cv.education.length > 0 && (
                        <div>
                          <p className="text-white/40 text-xs font-bold mb-2">التعليم</p>
                          {openCv.cv.education.map((e,i) => <p key={i} className="text-white/50 text-sm">· {e}</p>)}
                        </div>
                      )}
                      <div className="flex gap-2">
                        {openCv.cv.linkedin_url && <a href={openCv.cv.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: 'rgba(10,102,194,0.15)', border: '1px solid rgba(10,102,194,0.3)', color: '#0A66C2' }}><Linkedin size={12}/> LinkedIn</a>}
                        {openCv.cv.portfolio_url && <a href={openCv.cv.portfolio_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#8B5CF6' }}><ExternalLink size={12}/> Portfolio</a>}
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/40 text-sm">لم يرفع هذا المتقدم سيرة ذاتية بعد</p>
                  )}

                  {openCv.cover_letter && (
                    <div className="mt-4 border-t border-white/5 pt-4">
                      <p className="text-white/40 text-xs font-bold mb-2">رسالة التعريف</p>
                      <p className="text-white/60 text-sm leading-relaxed">{openCv.cover_letter}</p>
                    </div>
                  )}

                  {/* Stage actions */}
                  <div className="mt-5 border-t border-white/5 pt-4">
                    <p className="text-white/40 text-xs font-bold mb-3">تحريك المرحلة</p>
                    <div className="flex flex-wrap gap-2">
                      {STAGES_ORDER.filter(s => s !== 'withdrawn').map(s => {
                        const m = STAGE_META[s];
                        const current = openCv.status === s || openCv.stage === s;
                        return (
                          <button key={s} onClick={() => updateStage(openCv.id, s)} disabled={current || updatingApp === openCv.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60"
                            style={{ background: current ? `${m.color}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${current ? m.color : 'rgba(255,255,255,0.08)'}`, color: current ? m.color : 'rgba(255,255,255,0.4)' }}>
                            {current && <Check size={10} className="inline ml-1" />}{m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none">
              <select value={selectedJob === 'all' ? 'all' : String(selectedJob)} onChange={e => setSelectedJob(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/40 flex-shrink-0">
                <option value="all">كل الوظائف</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
              <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/40 flex-shrink-0">
                <option value="all">كل المراحل</option>
                {STAGES_ORDER.map(s => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
              </select>
              <span className="flex items-center text-white/30 text-xs px-2 flex-shrink-0">{filteredApps.length} نتيجة</span>
            </div>

            {filteredApps.length === 0 ? (
              <div className="text-center py-20">
                <Users size={40} className="text-white/15 mx-auto mb-4" />
                <p className="text-white/50 font-bold">لا يوجد متقدمون</p>
                <p className="text-white/25 text-sm mt-1">انشر وظائف لاستقطاب المتقدمين</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredApps.map(app => {
                  const stage = app.stage || app.status;
                  const sm = STAGE_META[stage] ?? STAGE_META.applied;
                  return (
                    <div key={app.id} className="rounded-2xl p-4 transition-all" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black"
                          style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', color: '#8B5CF6' }}>
                          {(app.applicant_name || app.applicant_username || '?').slice(0,2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white font-bold text-sm">{app.applicant_name || app.applicant_username}</p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${sm.color}18`, color: sm.color }}>
                              {sm.label}
                            </span>
                          </div>
                          <p className="text-white/35 text-xs mt-0.5">تقدم على: <span className="text-white/60">{app.job_title}</span></p>
                          {app.created_at && <p className="text-white/20 text-[10px] mt-0.5">{new Date(app.created_at).toLocaleDateString('ar-SA')}</p>}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button onClick={() => setOpenCv(app)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-1 justify-center"
                          style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#8B5CF6' }}>
                          <FileText size={12} /> السيرة الذاتية
                        </button>
                        {(stage === 'applied' || stage === 'pending' || stage === 'screening') && (
                          <>
                            <button onClick={() => updateStage(app.id, 'interview')} disabled={updatingApp === app.id}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-40"
                              style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', color: '#A78BFA' }}>
                              {updatingApp === app.id ? <Loader2 size={11} className="animate-spin"/> : <Check size={11}/>} مقابلة
                            </button>
                            <button onClick={() => updateStage(app.id, 'rejected')} disabled={updatingApp === app.id}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-40"
                              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                              <XCircle size={11}/> رفض
                            </button>
                          </>
                        )}
                        {stage === 'interview' && (
                          <button onClick={() => updateStage(app.id, 'hired')} disabled={updatingApp === app.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-40"
                            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981' }}>
                            {updatingApp === app.id ? <Loader2 size={11} className="animate-spin"/> : <UserCheck size={11}/>} توظيف
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════════ TALENT POOL ══════════════ */}
        {tab === 'talent' && (
          <div className="space-y-4">
            <div className="relative">
              <Search size={15} className="absolute right-3.5 top-3.5 text-white/30" />
              <input value={talentSearch} onChange={e => setTalentSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadTalent(talentSearch)}
                placeholder="ابحث بالاسم أو المسمى أو المهارة..."
                className="w-full bg-white/5 border border-white/8 rounded-xl py-3 pr-10 pl-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/40" />
            </div>
            {talentLoading ? (
              <div className="flex justify-center py-16"><Loader2 size={24} className="text-primary animate-spin" /></div>
            ) : talent.length === 0 ? (
              <div className="text-center py-16">
                <Star size={36} className="text-white/15 mx-auto mb-3" />
                <p className="text-white/50 font-bold">لا يوجد مرشحون مسجلون</p>
              </div>
            ) : (
              <div className="space-y-3">
                {talent.map(p => (
                  <div key={p.user_id} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black"
                        style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B' }}>
                        {(p.name || p.username).slice(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm">{p.name || p.username}</p>
                        {p.title && <p className="text-primary/80 text-xs mt-0.5">{p.title}</p>}
                        <div className="flex items-center gap-3 text-white/30 text-[11px] mt-1">
                          {p.location && <span className="flex items-center gap-1"><MapPin size={10}/>{p.location}</span>}
                          {p.years_experience != null && <span>{p.years_experience} سنوات خبرة</span>}
                        </div>
                        {p.skills && p.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {p.skills.slice(0,4).map((s,i) => <Tag key={i} color="#2E8BFF">{s}</Tag>)}
                            {p.skills.length > 4 && <span className="text-white/25 text-[10px] self-center">+{p.skills.length - 4}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ DIRECT HIRE ══════════════ */}
        {tab === 'direct-hire' && (
          <div className="space-y-5">
            {/* Method toggle */}
            <div className="flex gap-2">
              {([
                { k: 'email', l: 'بالبريد الإلكتروني', icon: <Mail size={13}/> },
                { k: 'icode', l: 'بالرمز التعريفي',    icon: <Hash size={13}/> },
              ] as const).map(m => (
                <button key={m.k} onClick={() => { setDhMethod(m.k); setDhMsg(null); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{ background: dhMethod === m.k ? 'rgba(20,224,164,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${dhMethod === m.k ? '#14E0A4' : 'rgba(255,255,255,0.08)'}`, color: dhMethod === m.k ? '#14E0A4' : 'rgba(255,255,255,0.35)' }}>
                  {m.icon} {m.l}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 space-y-4">
              {dhMethod === 'email' ? (
                <div>
                  <label className="text-white/40 text-xs mb-2 block">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail size={14} className="absolute right-3 top-3.5 text-white/25" />
                    <input value={dhEmail} onChange={e => setDhEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendInvite()} type="email" placeholder="employee@company.com" dir="ltr"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-9 pl-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-white/40 text-xs mb-2 block">الرمز التعريفي (I.code)</label>
                  <div className="relative">
                    <Hash size={14} className="absolute right-3 top-3.5 text-white/25" />
                    <input value={dhIcode} onChange={e => setDhIcode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && sendInvite()} placeholder="مثال: A7X2K9" dir="ltr" maxLength={12}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-9 pl-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 tracking-widest font-mono" />
                  </div>
                </div>
              )}
              <div>
                <label className="text-white/40 text-xs mb-2 block">الدور الوظيفي</label>
                <div className="flex gap-2 flex-wrap">
                  {[{ k:'employee',l:'موظف',c:'#2E8BFF'},{k:'manager',l:'مدير',c:'#8B5CF6'},{k:'admin',l:'مشرف',c:'#EF4444'}].map(r => (
                    <button key={r.k} onClick={() => setDhRole(r.k)}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{ background: dhRole === r.k ? `${r.c}18` : 'rgba(255,255,255,0.03)', border: `1px solid ${dhRole === r.k ? `${r.c}50` : 'rgba(255,255,255,0.08)'}`, color: dhRole === r.k ? r.c : 'rgba(255,255,255,0.35)' }}>
                      {r.l}
                    </button>
                  ))}
                </div>
              </div>
              {dhMsg && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold ${dhMsg.ok ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                  {dhMsg.ok ? <CheckCheck size={15}/> : <XCircle size={15}/>} {dhMsg.text}
                </div>
              )}
              <button onClick={sendInvite} disabled={dhLoading || (dhMethod === 'email' ? !dhEmail.trim() : !dhIcode.trim())}
                className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)', color: '#050810' }}>
                {dhLoading ? <Loader2 size={16} className="animate-spin"/> : <><UserPlus size={16}/> إرسال الدعوة</>}
              </button>
            </div>

            {/* Invite link */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Link2 size={14} className="text-primary" />
                  <span className="text-white font-bold text-sm">رابط الدعوة المباشر</span>
                </div>
                <button onClick={loadLink} disabled={linkLoading}><RefreshCw size={13} className={`text-white/30 ${linkLoading ? 'animate-spin' : ''}`} /></button>
              </div>
              {inviteLink ? (
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white/50 font-mono truncate" dir="ltr">{inviteLink}</div>
                  <button onClick={() => { navigator.clipboard.writeText(inviteLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 flex-shrink-0"
                    style={{ background: linkCopied ? 'rgba(20,224,164,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${linkCopied ? '#14E0A4' : 'rgba(255,255,255,0.1)'}`, color: linkCopied ? '#14E0A4' : 'rgba(255,255,255,0.6)' }}>
                    {linkCopied ? <><CheckCheck size={12}/> تم</> : <><Copy size={12}/> نسخ</>}
                  </button>
                </div>
              ) : (
                <button onClick={loadLink} disabled={linkLoading}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white/40 border border-white/8 flex items-center justify-center gap-2">
                  {linkLoading ? <Loader2 size={13} className="animate-spin"/> : <Link2 size={13}/>} توليد رابط الدعوة
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
