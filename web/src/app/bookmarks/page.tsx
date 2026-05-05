'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bookmark, Loader2, Repeat2, Briefcase, Calendar,
  Trash2, ChevronLeft, BookmarkX,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import {
  getHandovers, getProjects, getMeetings,
  type HandoverRow, type Project, type Meeting,
} from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';

// Bookmarks are stored in localStorage as { type, id }
const BM_KEY = 'alloul_bookmarks';

type BmRef = { type: 'handover' | 'project' | 'meeting'; id: number };

function loadBms(): BmRef[] {
  try { return JSON.parse(localStorage.getItem(BM_KEY) || '[]'); } catch { return []; }
}
function saveBms(bms: BmRef[]) {
  localStorage.setItem(BM_KEY, JSON.stringify(bms));
}

export function toggleBookmark(type: BmRef['type'], id: number) {
  const bms = loadBms();
  const idx = bms.findIndex((b) => b.type === type && b.id === id);
  if (idx >= 0) { bms.splice(idx, 1); } else { bms.push({ type, id }); }
  saveBms(bms);
  return idx < 0; // true = added
}

export function isBookmarked(type: BmRef['type'], id: number) {
  return loadBms().some((b) => b.type === type && b.id === id);
}

type SavedItem =
  | { kind: 'handover'; data: HandoverRow }
  | { kind: 'project';  data: Project }
  | { kind: 'meeting';  data: Meeting };

export default function BookmarksPage() {
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }

    const bms = loadBms();
    if (bms.length === 0) { setLoading(false); return; }

    Promise.all([
      getHandovers().catch(() => [] as HandoverRow[]),
      getProjects().catch(() => [] as Project[]),
      getMeetings().catch(() => [] as Meeting[]),
    ]).then(([handovers, projects, meetings]) => {
      const result: SavedItem[] = [];
      for (const bm of bms) {
        if (bm.type === 'handover') {
          const d = handovers.find((h) => h.id === bm.id);
          if (d) result.push({ kind: 'handover', data: d });
        } else if (bm.type === 'project') {
          const d = projects.find((p) => p.id === bm.id);
          if (d) result.push({ kind: 'project', data: d });
        } else if (bm.type === 'meeting') {
          const d = meetings.find((m) => m.id === bm.id);
          if (d) result.push({ kind: 'meeting', data: d });
        }
      }
      setItems(result);
    }).finally(() => setLoading(false));
  }, [router]);

  const remove = (kind: SavedItem['kind'], id: number) => {
    toggleBookmark(kind as BmRef['type'], id);
    setItems((prev) => prev.filter((x) => !(x.kind === kind && x.data.id === id)));
  };

  const clearAll = () => {
    saveBms([]);
    setItems([]);
  };

  return (
    <AppShell>
      <header className="sticky top-0 z-20 glass-chrome px-4 py-3 flex items-center gap-3">
        <Bookmark size={18} className="text-violet-400" />
        <h1 className="text-white font-black text-lg flex-1">المحفوظات</h1>
        {items.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-red-400/70 font-bold hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <Trash2 size={12} />
            مسح الكل
          </button>
        )}
      </header>

      <div className="px-4 py-4 pb-24 md:pb-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-primary animate-spin" />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <BookmarkX size={40} className="text-white/10" />
            <p className="text-white/30 text-sm font-medium">لا توجد عناصر محفوظة</p>
            <p className="text-white/20 text-xs text-center max-w-[220px]">
              احفظ تسليمات أو مشاريع أو اجتماعات لتجدها هنا
            </p>
          </div>
        )}

        <div className="space-y-2">
          {items.map((item) => {
            if (item.kind === 'handover') {
              const h = item.data;
              const rl = h.risk_level;
              const rc = rl === 'high' ? '#EF4444' : rl === 'medium' ? '#FFB24D' : '#14E0A4';
              return (
                <div key={`h-${h.id}`} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/8">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(20,224,164,0.12)', border: '1px solid rgba(20,224,164,0.3)' }}>
                    <Repeat2 size={16} className="text-secondary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-bold truncate">{h.handover_title}</div>
                    <div className="text-white/40 text-[11px] mt-0.5 truncate">
                      {h.client_name || 'تسليم'} {h.deadline ? `· ${h.deadline}` : ''}
                    </div>
                  </div>
                  {rl && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
                      style={{ background: `${rc}18`, color: rc, border: `1px solid ${rc}30` }}>
                      {rl === 'high' ? 'مرتفع' : rl === 'medium' ? 'متوسط' : 'منخفض'}
                    </span>
                  )}
                  <button onClick={() => remove('handover', h.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors">
                    <Bookmark size={14} className="fill-current" />
                  </button>
                  <Link href="/workspace/handover"><ChevronLeft size={14} className="text-white/20" /></Link>
                </div>
              );
            }

            if (item.kind === 'project') {
              const p = item.data;
              const sc = p.status === 'active' ? '#14E0A4' : p.status === 'completed' ? '#2E8BFF' : '#FFB24D';
              return (
                <div key={`p-${p.id}`} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/8">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${sc}18`, border: `1px solid ${sc}30` }}>
                    <Briefcase size={16} style={{ color: sc }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-bold truncate">{p.name}</div>
                    <div className="text-white/40 text-[11px] mt-0.5 truncate">{p.description || 'مشروع'}</div>
                  </div>
                  <button onClick={() => remove('project', p.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors">
                    <Bookmark size={14} className="fill-current" />
                  </button>
                  <Link href="/workspace/projects"><ChevronLeft size={14} className="text-white/20" /></Link>
                </div>
              );
            }

            if (item.kind === 'meeting') {
              const m = item.data;
              return (
                <div key={`m-${m.id}`} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/8">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,178,77,0.12)', border: '1px solid rgba(255,178,77,0.3)' }}>
                    <Calendar size={16} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-bold truncate">{m.title}</div>
                    <div className="text-white/40 text-[11px] mt-0.5 truncate">
                      {m.meeting_date || 'اجتماع'} {m.meeting_time ? `· ${m.meeting_time}` : ''}
                    </div>
                  </div>
                  <button onClick={() => remove('meeting', m.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors">
                    <Bookmark size={14} className="fill-current" />
                  </button>
                  <Link href="/workspace/meetings"><ChevronLeft size={14} className="text-white/20" /></Link>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </AppShell>
  );
}
