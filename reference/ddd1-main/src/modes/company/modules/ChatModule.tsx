import React from 'react';
import { MessageSquare, Search, Plus, ChevronLeft, User, Users2, Shield, MoreVertical, Star, CheckCheck } from 'lucide-react';
import { motion } from 'motion/react';

export function ChatModule({ onBack }: { onBack: () => void }) {
  const channels = [
    { name: 'العام (General)', lastMsg: 'أحمد: تم تحديث الخادم بنجاح', time: '10:30 ص', unread: 5, type: 'channel' },
    { name: 'فريق التطوير', lastMsg: 'سارة: هل انتهيت من التصميم؟', time: '09:45 ص', unread: 2, type: 'channel' },
    { name: 'إعلانات الشركة', lastMsg: 'الإدارة: نرحب بالموظفين الجدد', time: 'أمس', unread: 0, type: 'channel' },
  ];

  const directMessages = [
    { name: 'أحمد خالد', lastMsg: 'شكراً لك على المساعدة', time: '11:15 ص', unread: 0, status: 'online', avatar: 'https://picsum.photos/seed/1/50/50' },
    { name: 'سارة محمد', lastMsg: 'سأرسل الملف قريباً', time: '10:20 ص', unread: 1, status: 'away', avatar: 'https://picsum.photos/seed/2/50/50' },
    { name: 'خالد عبدالله', lastMsg: 'هل يمكننا الاجتماع؟', time: 'أمس', unread: 0, status: 'offline', avatar: 'https://picsum.photos/seed/3/50/50' },
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
            <h1 className="text-lg font-black text-white">المحادثات (Chat)</h1>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">تواصل داخلي آمن ومباشر</p>
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
            placeholder="بحث في المحادثات..." 
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#0066FF]/50 transition-all"
          />
        </div>
      </div>

      {/* Channels */}
      <div className="p-6 pb-0 space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mr-2">القنوات</h3>
        <div className="space-y-2">
          {channels.map((channel, i) => (
            <button key={i} className="w-full bento-card p-4 flex items-center gap-4 border-white/5 hover:bg-white/5 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-all">
                <Users2 size={20} />
              </div>
              <div className="flex-1 text-right">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-bold text-white"># {channel.name}</div>
                  <span className="text-[8px] text-white/20 font-black uppercase tracking-widest">{channel.time}</span>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <p className="text-[10px] text-white/30 font-bold truncate max-w-[180px]">{channel.lastMsg}</p>
                  {channel.unread > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#0066FF] text-[8px] font-black text-white flex items-center justify-center">
                      {channel.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Direct Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mr-2">الرسائل المباشرة</h3>
        <div className="space-y-2">
          {directMessages.map((dm, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="w-full bento-card p-4 flex items-center gap-4 border-white/5 hover:bg-white/5 transition-all group"
            >
              <div className="relative">
                <img src={dm.avatar} className="w-10 h-10 rounded-xl object-cover" />
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#050505] ${
                  dm.status === 'online' ? 'bg-green-500' : 
                  dm.status === 'away' ? 'bg-yellow-500' : 'bg-white/20'
                }`} />
              </div>
              <div className="flex-1 text-right">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-bold text-white">{dm.name}</div>
                  <span className="text-[8px] text-white/20 font-black uppercase tracking-widest">{dm.time}</span>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <p className="text-[10px] text-white/30 font-bold truncate max-w-[180px]">{dm.lastMsg}</p>
                  <div className="flex items-center gap-2">
                    {dm.unread > 0 ? (
                      <span className="w-4 h-4 rounded-full bg-[#0066FF] text-[8px] font-black text-white flex items-center justify-center">
                        {dm.unread}
                      </span>
                    ) : (
                      <CheckCheck size={12} className="text-[#0066FF]" />
                    )}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
