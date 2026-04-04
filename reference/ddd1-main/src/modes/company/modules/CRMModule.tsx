import React from 'react';
import { Briefcase, Search, Plus, ChevronLeft, User, Phone, Mail, DollarSign, TrendingUp, Filter, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export function CRMModule({ onBack }: { onBack: () => void }) {
  const leads = [
    { id: 1, name: 'شركة النور للتجارة', contact: 'أحمد محمد', value: '50,000 ر.س', status: 'proposal', date: 'منذ يوم' },
    { id: 2, name: 'مجموعة البركة العقارية', contact: 'سارة خالد', value: '120,000 ر.س', status: 'negotiation', date: 'منذ 3 أيام' },
    { id: 3, name: 'لوجستيك إكس', contact: 'خالد عبدالله', value: '25,000 ر.س', status: 'new', date: 'منذ 2س' },
    { id: 4, name: 'مطاعم الضيافة', contact: 'ليلى إبراهيم', value: '15,000 ر.س', status: 'closed', date: 'منذ أسبوع' },
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
            <h1 className="text-lg font-black text-white tracking-tight">إدارة العملاء (CRM)</h1>
            <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em]">إدارة المبيعات والفرص التجارية</p>
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
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-0.5">قيمة الفرص</div>
            <div className="text-xl font-black text-white tracking-tighter">210K</div>
          </div>
        </div>
        <div className="bento-card p-5 border-white/5 flex items-center gap-4 group hover:glow-blue transition-all duration-500">
          <div className="w-12 h-12 rounded-2xl glass text-[#0066FF] flex items-center justify-center group-hover:scale-110 transition-all">
            <User size={24} />
          </div>
          <div>
            <div className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-0.5">عملاء جدد</div>
            <div className="text-xl font-black text-white tracking-tighter">14</div>
          </div>
        </div>
      </div>

      {/* Pipeline Stages */}
      <div className="p-6 pb-0 overflow-x-auto hide-scrollbar flex gap-3">
        {['جديد', 'تواصل', 'عرض سعر', 'تفاوض', 'مغلق'].map((stage, i) => (
          <div key={i} className={`flex-shrink-0 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${
            i === 2 ? 'bg-[#0066FF] text-white border-[#0066FF]' : 'bg-white/5 text-white/40 border-white/5'
          }`}>
            {stage}
          </div>
        ))}
      </div>

      {/* Leads List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mr-2">الفرص النشطة</h3>
        <div className="space-y-4">
          {leads.map((lead, i) => (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bento-card p-5 space-y-4 border-white/5 hover:border-white/10 transition-all group"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="text-base font-bold text-white group-hover:text-[#0066FF] transition-colors">{lead.name}</div>
                  <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">المسؤول: {lead.contact}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                  lead.status === 'closed' ? 'bg-green-500/10 text-green-400' : 
                  lead.status === 'negotiation' ? 'bg-orange-500/10 text-orange-400' : 
                  'bg-blue-500/10 text-blue-400'
                }`}>
                  {lead.status === 'closed' ? 'مغلق' : lead.status === 'negotiation' ? 'تفاوض' : lead.status === 'proposal' ? 'عرض سعر' : 'جديد'}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-bold uppercase tracking-widest">
                    <DollarSign size={12} />
                    {lead.value}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-bold uppercase tracking-widest">
                    <Clock size={12} />
                    {lead.date}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all">
                    <Phone size={16} />
                  </button>
                  <button className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all">
                    <Mail size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
