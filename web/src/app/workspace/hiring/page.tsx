'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, UserPlus, Loader2, Briefcase, MapPin,
  Users, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock,
  Plus, X,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import {
  getMyCompanyJobs, getJobApplications, updateApplication, deleteJob, createJob,
  type JobPost, type JobApplication,
} from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  pending:  { color: '#FFB24D', label: 'بانتظار المراجعة' },
  accepted: { color: '#14E0A4', label: 'مقبول'           },
  rejected: { color: '#EF4444', label: 'مرفوض'           },
};

const JOB_TYPE_LABEL: Record<string, string> = {
  full_time: 'دوام كامل', part_time: 'دوام جزئي',
  contract: 'عقد', remote: 'عن بُعد', internship: 'تدريب',
};

export default function HiringPage() {
  const router = useRouter();
  const [jobs, setJobs]           = useState<JobPost[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<number | null>(null);
  const [apps, setApps]           = useState<Record<number, JobApplication[]>>({});
  const [appsLoading, setAppsLoading] = useState<number | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ title: '', job_type: 'full_time', location: '', description: '', salary_range: '' });
  const [creating, setCreating]   = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    load();
  }, [router]);

  async function load() {
    setLoading(true);
    try { setJobs(await getMyCompanyJobs()); } catch { setJobs([]); }
    setLoading(false);
  }

  async function toggleExpand(jobId: number) {
    if (expanded === jobId) { setExpanded(null); return; }
    setExpanded(jobId);
    if (!apps[jobId]) {
      setAppsLoading(jobId);
      try {
        const data = await getJobApplications(jobId);
        setApps(prev => ({ ...prev, [jobId]: data }));
      } catch { setApps(prev => ({ ...prev, [jobId]: [] })); }
      setAppsLoading(null);
    }
  }

  async function handleApp(jobId: number, appId: number, status: 'accepted' | 'rejected') {
    try {
      await updateApplication(jobId, appId, status);
      setApps(prev => ({
        ...prev,
        [jobId]: (prev[jobId] || []).map(a => a.id === appId ? { ...a, status } : a),
      }));
    } catch {}
  }

  async function handleDeleteJob(jobId: number) {
    try {
      await deleteJob(jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch {}
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      const job = await createJob(form);
      setJobs(prev => [job, ...prev]);
      setShowForm(false);
      setForm({ title: '', job_type: 'full_time', location: '', description: '', salary_range: '' });
    } catch {}
    setCreating(false);
  }

  return (
    <AppShell>
      <header className="sticky top-0 z-20 glass-chrome px-4 py-3 flex items-center gap-3">
        <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5 text-white/70">
          <ArrowRight size={18} />
        </Link>
        <UserPlus size={16} className="text-secondary-400" />
        <h1 className="text-white font-black text-[17px] flex-1">التوظيف</h1>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-colors">
          {showForm ? <X size={13} /> : <Plus size={13} />}
          {showForm ? 'إلغاء' : 'وظيفة جديدة'}
        </button>
      </header>

      <div className="px-4 py-4 pb-24 space-y-3">

        {/* Create Job Form */}
        {showForm && (
          <form onSubmit={handleCreate} className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
            <p className="text-white font-bold text-sm mb-1">إضافة وظيفة جديدة</p>
            <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="المسمى الوظيفي *" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary/50" />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.job_type} onChange={e => setForm(p => ({ ...p, job_type: e.target.value }))}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50">
                {Object.entries(JOB_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                placeholder="الموقع" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary/50" />
            </div>
            <input value={form.salary_range} onChange={e => setForm(p => ({ ...p, salary_range: e.target.value }))}
              placeholder="نطاق الراتب (اختياري)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary/50" />
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="وصف الوظيفة (اختياري)" rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary/50 resize-none" />
            <button type="submit" disabled={creating || !form.title.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-primary text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {creating && <Loader2 size={14} className="animate-spin" />}
              نشر الوظيفة
            </button>
          </form>
        )}

        {loading && <div className="flex justify-center py-20"><Loader2 size={24} className="text-primary animate-spin" /></div>}

        {!loading && jobs.length === 0 && (
          <div className="text-center py-20 text-white/40">
            <Briefcase size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">لا توجد وظائف منشورة بعد</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-primary-400 text-sm font-bold">انشر أول وظيفة ←</button>
          </div>
        )}

        {jobs.map(job => {
          const jobApps = apps[job.id] || [];
          const isOpen  = expanded === job.id;
          return (
            <div key={job.id} className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
              {/* Job Header */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/25 flex items-center justify-center flex-shrink-0">
                    <Briefcase size={16} className="text-secondary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-white font-black text-sm">{job.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/8 text-white/60">
                            {JOB_TYPE_LABEL[job.job_type] || job.job_type}
                          </span>
                          {job.location && (
                            <span className="flex items-center gap-1 text-[10px] text-white/40">
                              <MapPin size={9} /> {job.location}
                            </span>
                          )}
                          {job.salary_range && (
                            <span className="text-[10px] text-secondary-400 font-bold">{job.salary_range}</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteJob(job.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors flex-shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                    {job.description && (
                      <p className="text-white/40 text-xs mt-2 leading-relaxed line-clamp-2">{job.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1 text-white/50 text-xs">
                    <Users size={12} />
                    <span className="font-bold">{job.applications_count}</span> طلب
                  </div>
                  <button onClick={() => toggleExpand(job.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-primary-400 hover:text-primary-300 transition-colors">
                    {isOpen ? <><ChevronUp size={13} /> إخفاء الطلبات</> : <><ChevronDown size={13} /> عرض الطلبات</>}
                  </button>
                </div>
              </div>

              {/* Applications */}
              {isOpen && (
                <div className="border-t border-white/5 bg-white/[0.02]">
                  {appsLoading === job.id && (
                    <div className="flex justify-center py-6"><Loader2 size={18} className="text-primary animate-spin" /></div>
                  )}
                  {appsLoading !== job.id && jobApps.length === 0 && (
                    <p className="text-center py-6 text-white/30 text-xs">لا توجد طلبات بعد</p>
                  )}
                  {jobApps.map(app => {
                    const st = STATUS_STYLE[app.status] || STATUS_STYLE.pending;
                    return (
                      <div key={app.id} className="px-4 py-3 border-b border-white/5 last:border-0 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                          {(app.applicant_name || '?').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-bold truncate">{app.applicant_name || app.applicant_username || '—'}</p>
                          {app.cover_letter && (
                            <p className="text-white/40 text-[10px] mt-0.5 truncate">{app.cover_letter}</p>
                          )}
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: `${st.color}20`, color: st.color }}>
                          {st.label}
                        </span>
                        {app.status === 'pending' && (
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => handleApp(job.id, app.id, 'accepted')}
                              className="p-1.5 rounded-lg bg-secondary/15 border border-secondary/25 text-secondary hover:bg-secondary/25 transition-colors">
                              <CheckCircle2 size={13} />
                            </button>
                            <button onClick={() => handleApp(job.id, app.id, 'rejected')}
                              className="p-1.5 rounded-lg bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20 transition-colors">
                              <XCircle size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
