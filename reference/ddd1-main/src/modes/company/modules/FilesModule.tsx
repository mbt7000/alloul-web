import React from 'react';
import { FileText, Search, Plus, ChevronLeft, Clock, User, HardDrive, Folder, Image, MoreVertical, Download, Share2 } from 'lucide-react';
import { motion } from 'motion/react';

export function FilesModule({ onBack }: { onBack: () => void }) {
  const folders = [
    { name: 'المشاريع', count: 124, color: 'bg-blue-500' },
    { name: 'التقارير المالية', count: 45, color: 'bg-green-500' },
    { name: 'الموارد البشرية', count: 89, color: 'bg-yellow-500' },
    { name: 'التصاميم', count: 210, color: 'bg-purple-500' },
  ];

  const recentFiles = [
    { name: 'تقرير الربع الأول.pdf', size: '2.4 MB', date: 'منذ 2س', type: 'pdf' },
    { name: 'تصميم الواجهة.png', size: '5.1 MB', date: 'منذ 5س', type: 'image' },
    { name: 'قائمة الموظفين.xlsx', size: '1.2 MB', date: 'أمس', type: 'excel' },
    { name: 'دليل الشركة.docx', size: '850 KB', date: 'أمس', type: 'doc' },
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
            <h1 className="text-lg font-black text-white">الملفات (Files)</h1>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">مستودع المستندات الرسمي</p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shadow-lg shadow-[#0066FF]/20">
          <Plus size={20} />
        </button>
      </header>

      {/* Storage Quota */}
      <div className="p-6 pb-0">
        <div className="bento-card p-5 bg-gradient-to-br from-white/5 to-transparent border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/5 text-white/40">
                <HardDrive size={18} />
              </div>
              <div className="text-xs font-black text-white uppercase tracking-widest">مساحة التخزين</div>
            </div>
            <span className="text-[10px] font-black text-white/30">75% مستخدم</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '75%' }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-white rounded-full" 
            />
          </div>
          <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/20">
            <span>750 GB مستخدم</span>
            <span>1 TB الإجمالي</span>
          </div>
        </div>
      </div>

      {/* Folders Grid */}
      <div className="p-6 pb-0 space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mr-2">المجلدات الرئيسية</h3>
        <div className="grid grid-cols-2 gap-3">
          {folders.map((folder, i) => (
            <button key={i} className="bento-card p-4 flex flex-col items-start gap-3 hover:bg-white/5 transition-all group border-white/5">
              <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-all`}>
                <Folder size={20} className={folder.color.replace('bg-', 'text-')} />
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-white">{folder.name}</div>
                <div className="text-[8px] text-white/30 font-black uppercase tracking-widest">{folder.count} ملف</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Files */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mr-2">الملفات الأخيرة</h3>
        <div className="space-y-3">
          {recentFiles.map((file, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bento-card p-4 flex items-center gap-4 border-white/5 hover:border-white/10 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-all">
                {file.type === 'pdf' ? <FileText size={20} className="text-red-400" /> : 
                 file.type === 'image' ? <Image size={20} className="text-blue-400" /> : 
                 <FileText size={20} className="text-green-400" />}
              </div>
              <div className="flex-1 text-right">
                <div className="text-sm font-bold text-white truncate max-w-[150px]">{file.name}</div>
                <div className="text-[8px] text-white/30 font-black uppercase tracking-widest">{file.size} · {file.date}</div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white">
                  <Download size={16} />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white">
                  <Share2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
