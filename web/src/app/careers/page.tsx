'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase, Search, MapPin, Clock, Users, Building2,
  Filter, X, Send, Loader2, CheckCircle2, ChevronDown,
  ChevronUp, ArrowRight, Star, Globe,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.alloul.app';

interface Job {
  id: number; title: string; company_name?: string; company_logo?: string | null;
  job_type?: string; location?: string; salary_range?: string;
  min_experience?: number; description?: string; requirements?: string;
  applications_count: number; created_at?: string; applied_by_me: boolean;
  required_skills?: string[];
}

const JOB_TYPE_LABEL: Record<string, string> = {
  full_time: 'دوام كامل', part_time: 'دوام جزئي',
  contract: 'عقد مؤقت', internship: 'تدريب', remote: 'عن بُعد',
};

function Tag({ children, color = '#2E8BFF' }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {children}
    </span>
  );
}

function timeAgo(iso?: string) {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'اليوم';
  if (d === 1) return 'أمس';
  if (d < 7) return `منذ ${d} أيام`;
  if (d < 30) return `منذ ${Math.floor(d/7)} أسابيع`;
  return `منذ ${Math.floor(d/30)} أشهر`;
}

export default function CareersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070B14' }}>
        <Loader2 size={28} className="text-primary animate-spin" />
      </div>
    }>
      <CareersInner />
    </Suspense>
  );
}

function CareersInner() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState('');
  const [location, setLocation] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [applyId, setApplyId] = useState<number | null>(null);
  const [cover, setCover] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyDone, setApplyDone] = useState<Set<number>>(new Set());
  const loggedIn = isAuthenticated();

  const loadJobs = async (s = '', t = '', l = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (s) params.set('search', s);
      if (t) params.set('job_type', t);
      if (l) params.set('location', l);
      params.set('limit', '50');
      const res = await fetch(`${API_BASE}/careers/jobs?${params}`, {
        headers: loggedIn ? { Authorization: `Bearer ${localStorage.getItem('alloul_token')}` } : {},
      });
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadJobs(); }, []);

  const handleSearch = () => loadJobs(search, jobType, location);

  const applyJob = async () => {
    if (!applyId) return;
    if (!loggedIn) { router.push(`/login?redirect=${encodeURIComponent('/careers')}`); return; }
    setApplying(true);
    try {
      await apiFetch(`/careers/jobs/${applyId}/apply`, {
        method: 'POST',
        body: JSON.stringify({ cover_letter: cover || undefined }),
      });
      setApplyDone(prev => new Set([...prev, applyId]));
      setJobs(prev => prev.map(j => j.id === applyId ? { ...j, applied_by_me: true } : j));
      setApplyId(null); setCover('');
    } catch {} finally { setApplying(false); }
  };

  return (
    <div className="min-h-screen" style={{ background: '#070B14' }} dir="rtl">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(20,224,164,0.05) 0%, transparent 70%)' }} />

      {/* Nav */}
      <nav className="sticky top-0 z-20 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(7,11,20,0.85)' }}>
        <Link href="/" className="text-white font-black text-lg tracking-tight">
          ALLOUL<span style={{ color: '#14E0A4' }}>&Q</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-sm hidden sm:block">بوابة التوظيف</span>
          {loggedIn ? (
            <Link href="/careers/applications" className="px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
              طلباتي
            </Link>
          ) : (
            <Link href="/login?redirect=/careers" className="px-4 py-1.5 rounded-xl text-xs font-black"
              style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)', color: '#050810' }}>
              تسجيل الدخول
            </Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="px-4 py-12 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4"
          style={{ background: 'rgba(20,224,164,0.1)', border: '1px solid rgba(20,224,164,0.25)', color: '#14E0A4' }}>
          <Briefcase size={11} /> وظائف متاحة الآن
        </div>
        <h1 className="text-white font-black text-3xl sm:text-4xl mb-3 leading-tight">
          ابحث عن وظيفة <span style={{ color: '#14E0A4' }}>مناسبة لك</span>
        </h1>
        <p className="text-white/40 text-sm">وظائف من أفضل الشركات — قدّم مباشرة بسيرتك الذاتية</p>
      </div>

      {/* Search bar */}
      <div className="px-4 max-w-2xl mx-auto mb-8">
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="relative">
            <Search size={15} className="absolute right-3.5 top-3.5 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="ابحث عن مسمى وظيفي..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-10 pl-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/40" />
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin size={13} className="absolute right-3 top-3.5 text-white/25" />
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="المدينة / الدولة"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-9 pl-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/40" />
            </div>
            <select value={jobType} onChange={e => setJobType(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-primary/40">
              <option value="">كل الأنواع</option>
              {Object.entries(JOB_TYPE_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button onClick={handleSearch}
            className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)', color: '#050810' }}>
            <Search size={15} /> بحث
          </button>
        </div>
      </div>

      {/* Apply modal */}
      {applyId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'rgba(12,16,28,0.99)', border: '1px solid rgba(0,212,255,0.3)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-black text-lg">تقديم على الوظيفة</h2>
              <button onClick={() => setApplyId(null)}><X size={20} className="text-white/40" /></button>
            </div>
            <p className="text-white/40 text-xs mb-3">سيتم إرفاق سيرتك الذاتية تلقائياً</p>
            <textarea rows={4} value={cover} onChange={e => setCover(e.target.value)}
              placeholder="رسالة تعريفية (اختياري) — لماذا أنت مناسب لهذه الوظيفة؟"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50 text-sm resize-none mb-4" />
            <button onClick={applyJob} disabled={applying}
              className="w-full py-3 rounded-xl font-black disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(90deg,#00D4FF,#2E8BFF)', color: '#fff' }}>
              {applying ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} إرسال الطلب
            </button>
          </div>
        </div>
      )}

      {/* Jobs list */}
      <div className="px-4 pb-16 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-black text-base">{loading ? 'جارٍ التحميل...' : `${jobs.length} وظيفة`}</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="text-primary animate-spin" /></div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase size={40} className="text-white/15 mx-auto mb-4" />
            <p className="text-white/50 font-bold">لا توجد وظائف مطابقة</p>
            <button onClick={() => { setSearch(''); setJobType(''); setLocation(''); loadJobs(); }}
              className="mt-4 text-primary text-sm font-bold hover:underline">مسح الفلاتر</button>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="rounded-2xl overflow-hidden transition-all hover:border-white/12"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {/* Top accent for featured */}
                <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg,#14E0A440,transparent)' }} />

                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Company logo */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{ background: 'rgba(20,224,164,0.1)', border: '1px solid rgba(20,224,164,0.2)' }}>
                      {job.company_logo
                        ? <img src={job.company_logo} alt="" className="w-full h-full object-cover" />
                        : <Building2 size={20} style={{ color: '#14E0A4' }} />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white font-black text-base leading-snug">{job.title}</p>
                      {job.company_name && <p className="text-primary/80 text-xs font-bold mt-0.5">{job.company_name}</p>}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {job.location && <Tag color="#8B5CF6">{job.location}</Tag>}
                        {job.job_type && <Tag color="#2E8BFF">{JOB_TYPE_LABEL[job.job_type] || job.job_type}</Tag>}
                        {job.salary_range && <Tag color="#F59E0B">{job.salary_range}</Tag>}
                        {job.min_experience != null && <Tag color="#6B7280">{job.min_experience}+ سنوات</Tag>}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-white/25 text-[10px]">{timeAgo(job.created_at)}</span>
                      {job.applications_count > 0 && (
                        <span className="flex items-center gap-1 text-white/25 text-[10px]">
                          <Users size={9} /> {job.applications_count}
                        </span>
                      )}
                    </div>
                  </div>

                  {job.description && (
                    <p className="text-white/35 text-xs mt-3 line-clamp-2 leading-relaxed">{job.description}</p>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    {(job.applied_by_me || applyDone.has(job.id)) ? (
                      <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold flex-1 justify-center"
                        style={{ background: 'rgba(20,224,164,0.1)', border: '1px solid rgba(20,224,164,0.2)', color: '#14E0A4' }}>
                        <CheckCircle2 size={13} /> تم التقديم
                      </div>
                    ) : (
                      <button onClick={() => setApplyId(job.id)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black flex-1 justify-center transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(90deg,#14E0A4,#00D4FF)', color: '#050810' }}>
                        <Send size={13} /> تقديم على الوظيفة
                      </button>
                    )}
                    <button onClick={() => setExpanded(expanded === job.id ? null : job.id)}
                      className="p-2.5 rounded-xl text-white/30 hover:bg-white/5 transition-all flex-shrink-0">
                      {expanded === job.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {expanded === job.id && (job.description || job.requirements || job.required_skills?.length) && (
                  <div className="border-t border-white/5 px-4 py-4 space-y-3">
                    {job.description && (
                      <div>
                        <p className="text-white/30 text-[10px] font-bold mb-1">وصف الوظيفة</p>
                        <p className="text-white/50 text-xs leading-relaxed">{job.description}</p>
                      </div>
                    )}
                    {job.requirements && (
                      <div>
                        <p className="text-white/30 text-[10px] font-bold mb-1">المتطلبات</p>
                        <p className="text-white/50 text-xs leading-relaxed">{job.requirements}</p>
                      </div>
                    )}
                    {job.required_skills && job.required_skills.length > 0 && (
                      <div>
                        <p className="text-white/30 text-[10px] font-bold mb-1.5">المهارات المطلوبة</p>
                        <div className="flex flex-wrap gap-1.5">
                          {job.required_skills.map((s,i) => <Tag key={i} color="#14E0A4">{s}</Tag>)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-white/20 text-xs border-t border-white/5">
        <Link href="/workspace" className="text-primary/70 hover:text-primary font-bold">دخول ورك سبيس الشركات</Link>
        <span className="mx-3">·</span>
        ALLOUL&Q Digital © 2026
      </div>
    </div>
  );
}
