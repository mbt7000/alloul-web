import React, { useState } from 'react';
import { ChevronLeft, Plus, Users, Shield, Award, Briefcase, MoreVertical, Search, Filter, ArrowUpRight, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function CareerLadderModule({ onBack }: { onBack: () => void }) {
  const [employees, setEmployees] = useState([
    { id: 1, name: 'أحمد خالد', position: 'مدير العمليات', rank: 'L5', permissions: ['إدارة المشاريع', 'الموافقات المالية'], avatar: 'https://picsum.photos/seed/ahmad/100/100' },
    { id: 2, name: 'سارة محمد', position: 'كبير المصممين', rank: 'L4', permissions: ['إدارة الفريق', 'مراجعة التصاميم'], avatar: 'https://picsum.photos/seed/sara/100/100' },
    { id: 3, name: 'خالد عبدالله', position: 'مطور أول', rank: 'L3', permissions: ['الوصول للشيفرة', 'إدارة المستودعات'], avatar: 'https://picsum.photos/seed/khaled/100/100' },
    { id: 4, name: 'ليلى إبراهيم', position: 'أخصائي تسويق', rank: 'L2', permissions: ['إدارة الحملات', 'التقارير'], avatar: 'https://picsum.photos/seed/layla/100/100' },
  ]);

  const ranks = [
    { id: 'L1', label: 'مبتدئ (Junior)', color: 'bg-blue-500/10 text-blue-400' },
    { id: 'L2', label: 'متوسط (Mid)', color: 'bg-emerald-500/10 text-emerald-400' },
    { id: 'L3', label: 'أول (Senior)', color: 'bg-orange-500/10 text-orange-400' },
    { id: 'L4', label: 'خبير (Expert)', color: 'bg-purple-500/10 text-purple-400' },
    { id: 'L5', label: 'قيادي (Lead)', color: 'bg-rose-500/10 text-rose-400' },
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
            <h1 className="text-lg font-black text-white tracking-tight">السلم الوظيفي (Career Ladder)</h1>
            <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em]">إدارة الرتب والصلاحيات</p>
          </div>
        </div>
        <button className="w-12 h-12 rounded-2xl bg-[#0066FF] flex items-center justify-center text-white shadow-xl shadow-[#0066FF]/30 hover:scale-110 transition-all hover:glow-blue">
          <Plus size={24} />
        </button>
      </header>

      {/* Stats Summary */}
      <div className="p-6 pb-0 grid grid-cols-2 gap-4">
        <div className="bento-card p-5 border-white/5 flex items-center gap-4 group hover:glow-blue transition-all duration-500">
          <div className="w-12 h-12 rounded-2xl glass text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-all">
            <Award size={24} />
          </div>
          <div>
            <div className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-0.5">إجمالي الرتب</div>
            <div className="text-xl font-black text-white tracking-tighter">5 مستويات</div>
          </div>
        </div>
        <div className="bento-card p-5 border-white/5 flex items-center gap-4 group hover:glow-blue transition-all duration-500">
          <div className="w-12 h-12 rounded-2xl glass text-[#0066FF] flex items-center justify-center group-hover:scale-110 transition-all">
            <Shield size={24} />
          </div>
          <div>
            <div className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-0.5">الصلاحيات النشطة</div>
            <div className="text-xl font-black text-white tracking-tighter">24 صلاحية</div>
          </div>
        </div>
      </div>

      {/* Ranks Horizontal Scroll */}
      <div className="p-6 pb-0 overflow-x-auto hide-scrollbar flex gap-3">
        {ranks.map((rank, i) => (
          <div key={i} className={`flex-shrink-0 px-5 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${
            rank.id === 'L5' ? 'bg-[#0066FF] text-white border-[#0066FF]' : 'bg-white/5 text-white/40 border-white/5'
          }`}>
            {rank.label}
          </div>
        ))}
      </div>

      {/* Employees List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mr-2">إدارة الموظفين</h3>
          <button className="text-[10px] font-black text-[#0066FF] flex items-center gap-1">
            <Filter size={12} />
            تصفية
          </button>
        </div>
        <div className="space-y-4">
          {employees.map((emp, i) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bento-card p-5 space-y-5 border-white/5 hover:border-white/10 transition-all group"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl glass border border-white/10 p-1 group-hover:scale-105 transition-all">
                    <img src={emp.avatar} className="w-full h-full rounded-xl object-cover" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-base font-bold text-white group-hover:text-[#0066FF] transition-colors">{emp.name}</div>
                    <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{emp.position}</div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  ranks.find(r => r.id === emp.rank)?.color || 'bg-white/5 text-white/40'
                }`}>
                  {emp.rank}
                </span>
              </div>

              <div className="space-y-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/20">الصلاحيات والوصول</div>
                <div className="flex flex-wrap gap-2">
                  {emp.permissions.map((perm, j) => (
                    <span key={j} className="px-3 py-1.5 rounded-xl glass border border-white/5 text-[9px] font-black text-white/60 flex items-center gap-1.5">
                      <Shield size={10} className="text-[#0066FF]" />
                      {perm}
                    </span>
                  ))}
                  <button className="w-8 h-8 rounded-xl glass border border-white/5 flex items-center justify-center text-white/20 hover:text-white transition-all">
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-2 text-[10px] font-black text-emerald-400 hover:scale-105 transition-all">
                    <CheckCircle2 size={14} />
                    ترقية
                  </button>
                  <button className="flex items-center gap-2 text-[10px] font-black text-rose-400 hover:scale-105 transition-all">
                    <XCircle size={14} />
                    تجميد
                  </button>
                </div>
                <button className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all">
                  <MoreVertical size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
