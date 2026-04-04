import React from 'react';
import { Calendar, Search, Plus, ChevronLeft, Clock, User, Video, MapPin, Users2 } from 'lucide-react';
import { motion } from 'motion/react';

export function MeetingsModule({ onBack }: { onBack: () => void }) {
  const meetings = [
    { id: 1, title: 'مراجعة أداء الربع الأول', time: '10:00 ص', date: 'اليوم', type: 'online', attendees: 5, status: 'upcoming' },
    { id: 2, title: 'اجتماع الفريق التقني', time: '02:30 م', date: 'اليوم', type: 'office', attendees: 8, status: 'upcoming' },
    { id: 3, title: 'تخطيط مشروع ألّول ون', time: '11:00 ص', date: 'غداً', type: 'online', attendees: 12, status: 'upcoming' },
    { id: 4, title: 'مقابلة مرشح جديد', time: '09:00 ص', date: '25 مارس', type: 'online', attendees: 2, status: 'past' },
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
            <h1 className="text-lg font-black text-white">الاجتماعات (Meetings)</h1>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">جدولة ومحاضر الاجتماعات</p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shadow-lg shadow-[#0066FF]/20">
          <Plus size={20} />
        </button>
      </header>

      {/* Calendar Strip (Simplified) */}
      <div className="p-6 pb-0 overflow-x-auto hide-scrollbar flex gap-3">
        {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'].map((day, i) => (
          <div key={i} className={`flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all ${
            i === 0 ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/5'
          }`}>
            <span className="text-[8px] font-black uppercase tracking-widest">{day}</span>
            <span className="text-lg font-black">{29 + i}</span>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar">
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mr-2">اجتماعات اليوم</h3>
          {meetings.filter(m => m.date === 'اليوم').map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bento-card p-5 space-y-4 border-white/5 hover:border-white/10 transition-all relative overflow-hidden group"
            >
              <div className={`absolute top-0 right-0 w-1 h-full ${item.type === 'online' ? 'bg-[#0066FF]' : 'bg-green-500'}`} />
              
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <div className="text-base font-bold text-white group-hover:text-[#0066FF] transition-colors">{item.title}</div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-bold uppercase tracking-widest">
                      <Clock size={12} />
                      {item.time}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-bold uppercase tracking-widest">
                      {item.type === 'online' ? <Video size={12} /> : <MapPin size={12} />}
                      {item.type === 'online' ? 'عبر الإنترنت' : 'في المكتب'}
                    </div>
                  </div>
                </div>
                <div className="flex -space-x-2 rtl:space-x-reverse">
                  {[1, 2, 3].map((_, j) => (
                    <div key={j} className="w-7 h-7 rounded-full border-2 border-[#050505] bg-white/10 overflow-hidden">
                      <img src={`https://picsum.photos/seed/${j+10}/50/50`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {item.attendees > 3 && (
                    <div className="w-7 h-7 rounded-full border-2 border-[#050505] bg-white/5 flex items-center justify-center text-[8px] font-black text-white/40">
                      +{item.attendees - 3}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  item.type === 'online' 
                    ? 'bg-[#0066FF] text-white border-[#0066FF] shadow-lg shadow-[#0066FF]/20' 
                    : 'bg-white text-black border-white'
                }`}>
                  {item.type === 'online' ? 'انضم الآن' : 'عرض الموقع'}
                </button>
                <button className="p-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition-all border border-white/5">
                  <Users2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mr-2">قريباً</h3>
          {meetings.filter(m => m.date !== 'اليوم').map((item, i) => (
            <div key={item.id} className="bento-card p-4 flex items-center gap-4 border-white/5 opacity-60">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex flex-col items-center justify-center text-white/40">
                <span className="text-[8px] font-black">{item.date.split(' ')[1] || item.date}</span>
                <span className="text-sm font-black">{item.date.split(' ')[0]}</span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-white">{item.title}</div>
                <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{item.time} · {item.attendees} مشاركين</div>
              </div>
              <ChevronLeft size={16} className="text-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
