import React from 'react';
import { ShieldCheck, Search, Plus, ChevronLeft, Clock, User, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export function HandoverModule({ onBack }: { onBack: () => void }) {
  const handovers = [
    { id: 1, title: 'مشروع ألّول ون - المرحلة الثانية', owner: 'أحمد خالد', status: 'active', progress: 75, date: 'منذ 2س' },
    { id: 2, title: 'تحديثات الخادم الرئيسي', owner: 'نظام آلي', status: 'completed', progress: 100, date: 'منذ 5س' },
    { id: 3, title: 'مراجعة التصاميم الجديدة', owner: 'سارة محمد', status: 'pending', progress: 40, date: 'منذ يوم' },
    { id: 4, title: 'إعداد التقارير المالية', owner: 'خالد عبدالله', status: 'active', progress: 20, date: 'منذ 3س' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#050505] text-right" dir="rtl">
      {/* Header */}
      <header className="h-20 border-b border-white/5 flex items-center justify-between px-6 sticky top-0 bg-[#050505]/80 backdrop-blur-xl z-30">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-white/40 transition-colors rotate-180">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-lg font-black text-white">استمرارية العمل (Handover)</h1>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">إدارة تسليم المسؤوليات</p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shadow-lg shadow-[#0066FF]/20">
          <Plus size={20} />
        </button>
      </header>

      {/* Search */}
      <div className="p-6 pb-0">
        <div className="relative group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#0066FF] transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="بحث في عمليات التسليم..." 
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#0066FF]/50 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
        {handovers.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bento-card p-5 space-y-4 border-white/5 hover:border-white/10 transition-all"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1.5 flex-1">
                <div className="text-base font-bold text-white">{item.title}</div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-bold uppercase tracking-widest">
                    <User size={12} />
                    {item.owner}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-bold uppercase tracking-widest">
                    <Clock size={12} />
                    {item.date}
                  </div>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                item.status === 'completed' ? 'bg-green-500/10 text-green-400' : 
                item.status === 'active' ? 'bg-blue-500/10 text-blue-400' : 
                'bg-yellow-500/10 text-yellow-400'
              }`}>
                {item.status === 'completed' ? 'مكتمل' : item.status === 'active' ? 'نشط' : 'معلق'}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-white/30">نسبة الإنجاز</span>
                <span className="text-white">{item.progress}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${item.progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    item.status === 'completed' ? 'bg-green-500' : 'bg-[#0066FF]'
                  }`} 
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5">
                عرض التفاصيل
              </button>
              {item.status !== 'completed' && (
                <button className="flex-1 py-3 bg-[#0066FF]/10 hover:bg-[#0066FF]/20 text-[#0066FF] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-[#0066FF]/20">
                  تحديث الحالة
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
