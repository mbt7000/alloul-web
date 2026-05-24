'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, Loader2, Folder, Plus, X,
  ChevronDown, ChevronRight, CheckSquare, Circle,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getProjects, apiFetch, ApiError, type Project } from '@/lib/api-client';
import { isAuthenticated, clearToken } from '@/lib/auth';

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  active:      { label: 'نشط',   color: '#2E8BFF' },
  in_progress: { label: 'جارٍ',  color: '#F59E0B' },
  done:        { label: 'منتهي', color: '#14E0A4' },
  completed:   { label: 'مكتمل',color: '#14E0A4' },
  cancelled:   { label: 'ملغى', color: '#EF4444' },
};
const PRIORITY_COLOR: Record<string, string> = { high: '#EF4444', medium: '#F59E0B', low: '#14E0A4' };
const PRIORITY_LABEL: Record<string, string> = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };

interface Task { id: number; title: string; status: string; priority?: string; }

export default function TasksPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskMap, setTaskMap] = useState<Record<number, Task[]>>({});
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewTask, setShowNewTask] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [tTitle, setTTitle] = useState('');
  const [tPriority, setTPriority] = useState('medium');

  const load = async () => {
    try {
      const data = await getProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) { clearToken(); router.replace('/login'); }
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    load();
  }, [router]);

  const loadTasks = async (pid: number) => {
    if (taskMap[pid] !== undefined) return;
    try {
      const data = await apiFetch<Task[]>(`/projects/${pid}/tasks`);
      setTaskMap(prev => ({ ...prev, [pid]: Array.isArray(data) ? data : [] }));
    } catch { setTaskMap(prev => ({ ...prev, [pid]: [] })); }
  };

  const toggle = (id: number) => {
    const next = new Set(expanded);
    if (next.has(id)) { next.delete(id); } else { next.add(id); loadTasks(id); }
    setExpanded(next);
  };

  const createProject = async () => {
    if (!pName.trim()) return;
    setSaving(true);
    try {
      const created = await apiFetch('/projects/', {
        method: 'POST',
        body: JSON.stringify({ name: pName.trim(), description: pDesc || undefined, status: 'active' }),
      });
      setProjects(prev => [created as Project, ...prev]);
      setPName(''); setPDesc(''); setShowNewProject(false);
    } catch { } finally { setSaving(false); }
  };

  const createTask = async (pid: number) => {
    if (!tTitle.trim()) return;
    setSaving(true);
    try {
      const created = await apiFetch(`/projects/${pid}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ title: tTitle.trim(), priority: tPriority, status: 'todo' }),
      });
      setTaskMap(prev => ({ ...prev, [pid]: [created as Task, ...(prev[pid] || [])] }));
      setTTitle(''); setTPriority('medium'); setShowNewTask(null);
    } catch { } finally { setSaving(false); }
  };

  const toggleTaskDone = async (pid: number, task: Task) => {
    const next = task.status === 'done' ? 'todo' : 'done';
    try {
      await apiFetch(`/projects/${pid}/tasks/${task.id}`, {
        method: 'PATCH', body: JSON.stringify({ status: next }),
      });
      setTaskMap(prev => ({
        ...prev, [pid]: (prev[pid] || []).map(t => t.id === task.id ? { ...t, status: next } : t),
      }));
    } catch { }
  };

  return (
    <AppShell>
      <header className="sticky top-0 z-20 bg-dark-bg-900/85 backdrop-blur-xl border-b border-primary/10 px-4 py-3 flex items-center gap-4" dir="rtl">
        <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <ArrowRight size={18} />
        </Link>
        <h1 className="text-white font-black text-[17px] flex-1">المهام والمشاريع</h1>
        <button onClick={() => setShowNewProject(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
          style={{ background: 'rgba(46,139,255,0.15)', border: '1px solid rgba(46,139,255,0.35)', color: '#2E8BFF' }}>
          <Plus size={14} /> مشروع جديد
        </button>
      </header>

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4" dir="rtl">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(46,139,255,0.3)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-black text-lg">مشروع جديد</h2>
              <button onClick={() => setShowNewProject(false)}><X size={20} className="text-white/40" /></button>
            </div>
            <div className="space-y-3 mb-5">
              <input autoFocus value={pName} onChange={e => setPName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createProject()}
                placeholder="اسم المشروع *"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
              <textarea rows={2} value={pDesc} onChange={e => setPDesc(e.target.value)}
                placeholder="وصف (اختياري)"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm resize-none" />
            </div>
            <button onClick={createProject} disabled={saving || !pName.trim()}
              className="w-full py-3 rounded-xl text-white font-black disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(90deg,#2E8BFF,#00D4FF)' }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              إنشاء المشروع
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-5 pb-24 md:pb-10" dir="rtl">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={22} className="text-primary animate-spin" /></div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Folder size={28} className="text-primary" />
            </div>
            <p className="text-white/70 font-bold mb-2">لا يوجد مشاريع بعد</p>
            <p className="text-white/40 text-sm mb-4">أنشئ أول مشروع لفريقك</p>
            <button onClick={() => setShowNewProject(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(46,139,255,0.15)', border: '1px solid rgba(46,139,255,0.3)', color: '#2E8BFF' }}>
              <Plus size={14} className="inline ml-1" />إنشاء مشروع
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((p) => {
              const st = STATUS_STYLE[p.status] ?? STATUS_STYLE.active;
              const prog = p.tasks_count ? Math.round(((p.completed_count ?? 0) / p.tasks_count) * 100) : 0;
              const isOpen = expanded.has(p.id);
              const pTasks = taskMap[p.id];

              return (
                <div key={p.id} className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                  <button onClick={() => toggle(p.id)} className="w-full p-4 text-right flex items-start gap-3 hover:bg-white/[0.02] transition-colors">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${st.color}22`, border: `1px solid ${st.color}44` }}>
                      <Folder size={18} style={{ color: st.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold text-sm truncate">{p.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: `${st.color}22`, color: st.color }}>{st.label}</span>
                      </div>
                      {p.tasks_count !== undefined && p.tasks_count > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${prog}%`, background: st.color }} />
                          </div>
                          <span className="text-white/40 text-[11px]">{p.completed_count ?? 0}/{p.tasks_count}</span>
                        </div>
                      )}
                    </div>
                    {isOpen ? <ChevronDown size={16} className="text-white/30 mt-1" /> : <ChevronRight size={16} className="text-white/30 mt-1" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-white/5 px-4 pb-4">
                      {showNewTask === p.id ? (
                        <div className="pt-3 space-y-2">
                          <input autoFocus value={tTitle} onChange={e => setTTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && createTask(p.id)}
                            placeholder="عنوان المهمة..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm" />
                          <div className="flex gap-2">
                            {(['high', 'medium', 'low'] as const).map(pr => (
                              <button key={pr} onClick={() => setTPriority(pr)}
                                className="flex-1 py-1.5 rounded-lg text-xs font-bold"
                                style={{
                                  background: tPriority === pr ? `${PRIORITY_COLOR[pr]}22` : 'rgba(255,255,255,0.03)',
                                  border: `1px solid ${tPriority === pr ? PRIORITY_COLOR[pr] : 'rgba(255,255,255,0.08)'}`,
                                  color: tPriority === pr ? PRIORITY_COLOR[pr] : 'rgba(255,255,255,0.3)',
                                }}>{PRIORITY_LABEL[pr]}</button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => createTask(p.id)} disabled={saving || !tTitle.trim()}
                              className="flex-1 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
                              style={{ background: 'rgba(46,139,255,0.15)', color: '#2E8BFF', border: '1px solid rgba(46,139,255,0.3)' }}>
                              {saving ? <Loader2 size={14} className="animate-spin inline" /> : 'إضافة'}
                            </button>
                            <button onClick={() => { setShowNewTask(null); setTTitle(''); }}
                              className="px-4 py-2 rounded-xl text-sm text-white/40">إلغاء</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setShowNewTask(p.id); setTTitle(''); setTPriority('medium'); }}
                          className="w-full mt-3 py-2 rounded-xl border border-dashed border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 text-sm flex items-center justify-center gap-2 transition-all">
                          <Plus size={14} /> إضافة مهمة
                        </button>
                      )}

                      {!pTasks ? (
                        <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-white/30" /></div>
                      ) : pTasks.length === 0 && showNewTask !== p.id ? (
                        <p className="text-white/30 text-xs text-center py-3">لا يوجد مهام — أضف أول مهمة</p>
                      ) : (
                        <div className="space-y-1 mt-2">
                          {pTasks.map(task => (
                            <div key={task.id} className="flex items-center gap-3 py-2 px-1 rounded-xl hover:bg-white/[0.02] group">
                              <button onClick={() => toggleTaskDone(p.id, task)} className="flex-shrink-0">
                                {task.status === 'done'
                                  ? <CheckSquare size={18} style={{ color: '#14E0A4' }} />
                                  : <Circle size={18} className="text-white/20 group-hover:text-white/40" />}
                              </button>
                              <span className={`flex-1 text-sm ${task.status === 'done' ? 'line-through text-white/30' : 'text-white/80'}`}>{task.title}</span>
                              {task.priority && task.priority !== 'medium' && (
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLOR[task.priority] ?? '#fff' }} />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
