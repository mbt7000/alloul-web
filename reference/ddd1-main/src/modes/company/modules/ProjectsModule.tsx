import React from 'react';
import { Briefcase, Search, Plus, ChevronLeft, Clock, User, CheckSquare, BarChart3, MoreVertical, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

export function ProjectsModule({ onBack }: { onBack: () => void }) {
  const projects = [
    { id: 1, title: 'تطوير تطبيق ألّول ون', client: 'داخلي', progress: 65, status: 'active', tasks: 24, deadline: '15 أبريل' },
    { id: 2, title: 'حملة التسويق الرمضانية', client: 'شركة النور', progress: 40, status: 'active', tasks: 12, deadline: '20 مارس' },
    { id: 3, title: 'تحديث الهوية البصرية', client: 'مجموعة البركة', progress: 100, status: 'completed', tasks: 45, deadline: '10 مارس' },
    { id: 4, title: 'نظام إدارة المستودعات', client: 'لوجستيك إكس', progress: 15, status: 'on-hold', tasks: 8, deadline: '30 مايو' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#050505] text-right" dir="rtl">
      {/* Header */}
      <header className="h-24 border-b border-white/5 flex items-center justify-between px-8 sticky top-0 glass-dark z-30">
        <div className="flex items-center gap-5">
          <button onClick={onBack} className="w-11 h-11 glass rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all hover:scale-110 rotate-180">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">المشاريع (Projects)</h1>
            <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em]">تتبع المهام والخطط التنفيذية</p>
          </div>
        </div>
        <button className="w-12 h-12 rounded-2xl bg-[#0066FF] flex items-center justify-center text-white shadow-xl shadow-[#0066FF]/30 hover:scale-110 transition-all hover:glow-blue">
          <Plus size={24} />
        </button>
      </header>

      {/* Stats Summary */}
      <div className="p-6 pb-0 grid grid-cols-2 gap-4">
        <div className="bento-card p-5 border-white/5 flex items-center gap-4 group hover:glow-blue transition-all duration-500">
          <div className="w-12 h-12 rounded-2xl glass text-[#0066FF] flex items-center justify-center group-hover:scale-110 transition-all">
            <BarChart3 size={24} />
          </div>
          <div>
            <div className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-0.5">مشاريع نشطة</div>
            <div className="text-xl font-black text-white tracking-tighter">12</div>
          </div>
        </div>
        <div className="bento-card p-5 border-white/5 flex items-center gap-4 group hover:glow-blue transition-all duration-500">
          <div className="w-12 h-12 rounded-2xl glass text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-all">
            <CheckSquare size={24} />
          </div>
          <div>
            <div className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-0.5">مهام مكتملة</div>
            <div className="text-xl font-black text-white tracking-tighter">145</div>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mr-2">قائمة المشاريع</h3>
        <div className="space-y-4">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bento-card p-5 space-y-4 border-white/5 hover:border-white/10 transition-all group"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="text-base font-bold text-white group-hover:text-[#0066FF] transition-colors">{project.title}</div>
                  <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">العميل: {project.client}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                  project.status === 'completed' ? 'bg-green-500/10 text-green-400' : 
                  project.status === 'active' ? 'bg-blue-500/10 text-blue-400' : 
                  'bg-yellow-500/10 text-yellow-400'
                }`}>
                  {project.status === 'completed' ? 'مكتمل' : project.status === 'active' ? 'نشط' : 'متوقف'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-white/30">التقدم</span>
                  <span className="text-white">{project.progress}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${project.progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      project.status === 'completed' ? 'bg-green-500' : 'bg-[#0066FF]'
                    }`} 
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-bold uppercase tracking-widest">
                    <CheckSquare size={12} />
                    {project.tasks} مهمة
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-bold uppercase tracking-widest">
                    <Clock size={12} />
                    {project.deadline}
                  </div>
                </div>
                <button className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all">
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
