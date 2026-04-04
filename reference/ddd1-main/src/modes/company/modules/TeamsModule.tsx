import React from 'react';
import { Users2, Search, Plus, ChevronLeft, User, Shield, Mail, Phone, MoreVertical, Star } from 'lucide-react';
import { motion } from 'motion/react';

export function TeamsModule({ onBack }: { onBack: () => void }) {
  const teams = [
    { name: 'فريق التطوير', members: 12, lead: 'أحمد خالد', color: 'bg-blue-500' },
    { name: 'فريق التصميم', members: 5, lead: 'سارة محمد', color: 'bg-purple-500' },
    { name: 'الموارد البشرية', members: 8, lead: 'خالد عبدالله', color: 'bg-green-500' },
    { name: 'التسويق والمبيعات', members: 15, lead: 'ليلى إبراهيم', color: 'bg-orange-500' },
  ];

  const members = [
    { name: 'أحمد خالد', role: 'مدير تقني', team: 'التطوير', status: 'online', avatar: 'https://picsum.photos/seed/1/50/50' },
    { name: 'سارة محمد', role: 'مصممة أولى', team: 'التصميم', status: 'away', avatar: 'https://picsum.photos/seed/2/50/50' },
    { name: 'خالد عبدالله', role: 'مدير HR', team: 'الموارد البشرية', status: 'offline', avatar: 'https://picsum.photos/seed/3/50/50' },
    { name: 'ليلى إبراهيم', role: 'مديرة تسويق', team: 'التسويق', status: 'online', avatar: 'https://picsum.photos/seed/4/50/50' },
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
            <h1 className="text-lg font-black text-white">الفرق (Teams)</h1>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">إدارة الأقسام والموظفين</p>
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
            placeholder="بحث عن موظف أو فريق..." 
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#0066FF]/50 transition-all"
          />
        </div>
      </div>

      {/* Teams Horizontal Scroll */}
      <div className="p-6 pb-0 overflow-x-auto hide-scrollbar flex gap-4">
        {teams.map((team, i) => (
          <div key={i} className="flex-shrink-0 w-40 bento-card p-4 border-white/5 space-y-3 hover:bg-white/5 transition-all group">
            <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-all`}>
              <Users2 size={20} className={team.color.replace('bg-', 'text-')} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-white truncate">{team.name}</div>
              <div className="text-[8px] text-white/30 font-black uppercase tracking-widest">{team.members} عضو</div>
            </div>
          </div>
        ))}
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mr-2">أعضاء الفريق</h3>
        <div className="space-y-3">
          {members.map((member, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bento-card p-4 flex items-center gap-4 border-white/5 hover:border-white/10 transition-all group"
            >
              <div className="relative">
                <img src={member.avatar} className="w-12 h-12 rounded-2xl object-cover" />
                <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#050505] ${
                  member.status === 'online' ? 'bg-green-500' : 
                  member.status === 'away' ? 'bg-yellow-500' : 'bg-white/20'
                }`} />
              </div>
              <div className="flex-1 text-right">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold text-white">{member.name}</div>
                  {member.role.includes('مدير') && <Shield size={12} className="text-[#0066FF]" />}
                </div>
                <div className="text-[8px] text-white/30 font-black uppercase tracking-widest">{member.role} · {member.team}</div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white">
                  <Mail size={16} />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white">
                  <Phone size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
