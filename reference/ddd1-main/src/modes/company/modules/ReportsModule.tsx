import React from 'react';
import { BarChart3, Search, Download, ChevronLeft, Clock, User, TrendingUp, TrendingDown, PieChart, FileText, Filter } from 'lucide-react';
import { motion } from 'motion/react';

export function ReportsModule({ onBack }: { onBack: () => void }) {
  const metrics = [
    { label: 'الإيرادات الشهرية', value: '450,000 ر.س', trend: '+15%', positive: true },
    { label: 'المشاريع المكتملة', value: '24', trend: '+8%', positive: true },
    { label: 'ساعات العمل', value: '1,420', trend: '-2%', positive: false },
    { label: 'رضا العملاء', value: '98%', trend: '+1%', positive: true },
  ];

  const reports = [
    { title: 'تقرير الأداء السنوي 2025', date: 'منذ يومين', size: '4.5 MB' },
    { title: 'تحليل المبيعات - الربع الأول', date: 'منذ أسبوع', size: '2.1 MB' },
    { title: 'تقرير الموارد البشرية الشهري', date: 'منذ أسبوعين', size: '1.8 MB' },
    { title: 'مراجعة استمرارية العمل', date: 'منذ شهر', size: '3.2 MB' },
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
            <h1 className="text-lg font-black text-white">التقارير (Reports)</h1>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">تحليلات الأداء والذكاء المؤسسي</p>
          </div>
        </div>
        <button className="p-2.5 hover:bg-white/5 rounded-xl text-white/40 transition-colors">
          <Filter size={20} />
        </button>
      </header>

      {/* Metrics Grid */}
      <div className="p-6 pb-0 grid grid-cols-2 gap-3">
        {metrics.map((metric, i) => (
          <div key={i} className="bento-card p-4 border-white/5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[8px] text-white/30 font-black uppercase tracking-widest">{metric.label}</span>
              <span className={`text-[8px] font-black flex items-center gap-0.5 ${metric.positive ? 'text-green-400' : 'text-red-400'}`}>
                {metric.positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {metric.trend}
              </span>
            </div>
            <div className="text-lg font-black text-white">{metric.value}</div>
          </div>
        ))}
      </div>

      {/* Performance Chart (Simplified SVG) */}
      <div className="p-6 pb-0">
        <div className="bento-card p-6 border-white/5 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mr-2">مخطط النمو السنوي</h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#0066FF]" />
                <span className="text-[8px] text-white/40 font-black uppercase tracking-widest">2025</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-white/10" />
                <span className="text-[8px] text-white/40 font-black uppercase tracking-widest">2024</span>
              </div>
            </div>
          </div>
          <div className="h-40 w-full flex items-end justify-between gap-2 px-2">
            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full relative">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.05, duration: 1 }}
                    className="w-full bg-[#0066FF]/20 group-hover:bg-[#0066FF] rounded-t-sm transition-all" 
                  />
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${h * 0.6}%` }}
                    transition={{ delay: i * 0.05, duration: 1 }}
                    className="absolute bottom-0 w-full bg-white/5 rounded-t-sm" 
                  />
                </div>
                <span className="text-[6px] text-white/20 font-black uppercase tracking-widest">{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Generated Reports */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mr-2">التقارير الجاهزة</h3>
        <div className="space-y-3">
          {reports.map((report, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bento-card p-4 flex items-center gap-4 border-white/5 hover:border-white/10 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-all">
                <FileText size={20} />
              </div>
              <div className="flex-1 text-right">
                <div className="text-sm font-bold text-white truncate max-w-[200px]">{report.title}</div>
                <div className="text-[8px] text-white/30 font-black uppercase tracking-widest">{report.size} · {report.date}</div>
              </div>
              <button className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all">
                <Download size={16} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
