'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search, Loader2, Users, Briefcase, TrendingUp,
  Building2, ChevronLeft, Star, MapPin,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getCompanyMembers, getProjects, type CompanyMember, type Project } from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';

const CATEGORIES = [
  { label: 'الكل',    value: 'all' },
  { label: 'الأشخاص', value: 'people' },
  { label: 'المشاريع', value: 'projects' },
];

export default function ExplorePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all');
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    Promise.all([
      getCompanyMembers().catch(() => []),
      getProjects().catch(() => []),
    ]).then(([m, p]) => {
      setMembers(m);
      setProjects(p);
    }).finally(() => setLoading(false));
  }, [router]);

  const filteredMembers = useMemo(() =>
    members.filter((m) =>
      !query ||
      (m.user_name ?? '').toLowerCase().includes(query.toLowerCase()) ||
      (m.user_email ?? '').toLowerCase().includes(query.toLowerCase()) ||
      (m.job_title ?? '').toLowerCase().includes(query.toLowerCase())
    ), [members, query]);

  const filteredProjects = useMemo(() =>
    projects.filter((p) =>
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(query.toLowerCase())
    ), [projects, query]);

  const STATUS_COLOR: Record<string, string> = {
    active:     '#14E0A4',
    completed:  '#2E8BFF',
    on_hold:    '#FFB24D',
    cancelled:  '#EF4444',
  };

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 glass-chrome px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <Search size={18} className="text-primary-400" />
          <h1 className="text-white font-black text-lg flex-1">استكشاف</h1>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن شخص أو مشروع..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pr-10 pl-4 text-white placeholder-white/30 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/[0.07]"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setTab(c.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                tab === c.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4 pb-24 md:pb-8 space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-primary animate-spin" />
          </div>
        )}

        {/* ── People ── */}
        {!loading && (tab === 'all' || tab === 'people') && filteredMembers.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users size={14} className="text-white/40" />
              <h2 className="text-white/40 text-[11px] font-black uppercase tracking-wider">الأشخاص</h2>
            </div>
            <div className="space-y-2">
              {filteredMembers.map((m) => {
                const initials = (m.user_name || m.user_email || 'U').slice(0, 2).toUpperCase();
                const roleColor = m.role === 'owner' ? '#FFB24D' : m.role === 'admin' ? '#14E0A4' : '#8B5CF6';
                const roleLabel = m.role === 'owner' ? 'مالك' : m.role === 'admin' ? 'مسؤول' : 'عضو';
                return (
                  <Link
                    key={m.id}
                    href="/workspace/team"
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/8 hover:bg-white/[0.06] transition-colors"
                  >
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #2E8BFF55, #00D4FF55)' }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-bold truncate">
                        {m.user_name || m.user_email}
                      </div>
                      <div className="text-white/40 text-[11px] truncate mt-0.5">
                        {m.job_title || m.user_email || '—'}
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
                      style={{ background: `${roleColor}18`, color: roleColor, border: `1px solid ${roleColor}30` }}
                    >
                      {roleLabel}
                    </span>
                    <ChevronLeft size={14} className="text-white/20 flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Projects ── */}
        {!loading && (tab === 'all' || tab === 'projects') && filteredProjects.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Briefcase size={14} className="text-white/40" />
              <h2 className="text-white/40 text-[11px] font-black uppercase tracking-wider">المشاريع</h2>
            </div>
            <div className="space-y-2">
              {filteredProjects.map((p) => {
                const pct = p.tasks_count ? Math.round(((p.completed_count ?? 0) / p.tasks_count) * 100) : 0;
                const sc = STATUS_COLOR[p.status] ?? '#94A3B8';
                return (
                  <Link
                    key={p.id}
                    href="/workspace/projects"
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/8 hover:bg-white/[0.06] transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${sc}18`, border: `1px solid ${sc}30` }}
                    >
                      <TrendingUp size={16} style={{ color: sc }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-bold truncate">{p.name}</div>
                      {p.description && (
                        <div className="text-white/40 text-[11px] truncate mt-0.5">{p.description}</div>
                      )}
                      {(p.tasks_count ?? 0) > 0 && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: sc }}
                            />
                          </div>
                          <span className="text-[10px] text-white/30">{pct}%</span>
                        </div>
                      )}
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
                      style={{ background: `${sc}18`, color: sc, border: `1px solid ${sc}30` }}
                    >
                      {p.status === 'active' ? 'نشط' : p.status === 'completed' ? 'مكتمل' : p.status === 'on_hold' ? 'معلق' : p.status}
                    </span>
                    <ChevronLeft size={14} className="text-white/20 flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!loading && filteredMembers.length === 0 && filteredProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Search size={40} className="text-white/10" />
            <p className="text-white/30 text-sm font-medium">
              {query ? 'لا توجد نتائج مطابقة' : 'لا يوجد محتوى للاستكشاف بعد'}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
