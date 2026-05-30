'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search, Sparkles, FileText, CheckSquare, Users, Calendar, Loader2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { apiFetch } from '@/lib/api-client';

const CATEGORIES = [
  { label: 'الكل', value: 'all' },
  { label: 'المهام', value: 'tasks' },
  { label: 'المشاريع', value: 'projects' },
  { label: 'الفريق', value: 'team' },
  { label: 'الاجتماعات', value: 'meetings' },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await apiFetch(`/search?q=${encodeURIComponent(query)}&type=${category}`).catch(() => []);
      setResults(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const iconFor = (type: string) => {
    if (type === 'task') return <CheckSquare size={16} className="text-primary" />;
    if (type === 'member') return <Users size={16} className="text-accent" />;
    if (type === 'meeting') return <Calendar size={16} className="text-secondary" />;
    return <FileText size={16} className="text-white/50" />;
  };

  return (
    <AppShell>
      <header className="sticky top-0 z-20 glass-chrome px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5 text-white/70">
            <ArrowRight size={18} />
          </Link>
          <h1 className="text-white font-black text-[17px]">البحث الذكي</h1>
          <div className="mr-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30">
            <Sparkles size={10} className="text-primary" />
            <span className="text-primary text-[10px] font-black">AI</span>
          </div>
        </div>
        <form onSubmit={handleSearch} className="relative">
          <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في كل شيء..."
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pr-10 pl-16 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary/40"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="absolute left-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-40"
          >
            بحث
          </button>
        </form>
      </header>

      <div className="px-4 py-4 pb-24">
        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none mb-5">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                background: category === c.value ? 'rgba(46,139,255,0.25)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${category === c.value ? 'rgba(46,139,255,0.6)' : 'rgba(255,255,255,0.1)'}`,
                color: category === c.value ? '#2E8BFF' : 'rgba(255,255,255,0.5)',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-primary animate-spin" />
          </div>
        ) : searched && results.length === 0 ? (
          <div className="text-center py-20 text-white/40">
            <Search size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد نتائج لـ "{query}"</p>
          </div>
        ) : !searched ? (
          <div className="text-center py-20 text-white/30">
            <Search size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">ابحث في المهام، المشاريع، الفريق وأكثر</p>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  {iconFor(r.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{r.title || r.name}</p>
                  {r.description && <p className="text-white/40 text-xs mt-0.5 truncate">{r.description}</p>}
                </div>
                <span className="text-white/20 text-[10px]">{r.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
