'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Folder, FileText, Image, Film, Archive, Upload, Search, MoreVertical } from 'lucide-react';
import AppShell from '@/components/AppShell';

const MOCK_FILES = [
  { name: 'تقرير المبيعات Q1.pdf',   type: 'pdf',   size: '2.4 MB', date: 'اليوم',      color: '#FF4757' },
  { name: 'صور المشروع',              type: 'folder',size: '14 ملف', date: 'أمس',        color: '#FFB24D' },
  { name: 'عرض الشركة.pptx',         type: 'ppt',   size: '8.1 MB', date: 'منذ 3 أيام', color: '#FF6B35' },
  { name: 'قاعدة بيانات العملاء.xlsx',type: 'excel', size: '1.2 MB', date: 'منذ أسبوع',  color: '#14E0A4' },
  { name: 'فيديو تعريفي.mp4',         type: 'video', size: '54 MB',  date: 'منذ أسبوع',  color: '#8B5CF6' },
  { name: 'صور الفريق',               type: 'folder',size: '23 ملف', date: 'منذ شهر',    color: '#00D4FF' },
];

const ICON_MAP: Record<string, React.ReactNode> = {
  folder: <Folder size={20} />,
  pdf:    <FileText size={20} />,
  ppt:    <FileText size={20} />,
  excel:  <FileText size={20} />,
  image:  <Image size={20} />,
  video:  <Film size={20} />,
  zip:    <Archive size={20} />,
};

export default function FilesPage() {
  const [query, setQuery] = useState('');

  const filtered = MOCK_FILES.filter((f) =>
    query === '' || f.name.includes(query)
  );

  return (
    <AppShell>
      <header className="sticky top-0 z-20 glass-chrome px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5 text-white/70">
            <ArrowRight size={18} />
          </Link>
          <h1 className="text-white font-black text-[17px]">الملفات</h1>
          <button className="mr-auto w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Upload size={15} className="text-primary" />
          </button>
        </div>
        <div className="relative">
          <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في الملفات..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary/40"
          />
        </div>
      </header>

      <div className="px-4 py-4 pb-24">
        {/* Storage bar */}
        <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] mb-5">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-white/60">المساحة المستخدمة</span>
            <span className="text-white font-bold">2.4 GB / 10 GB</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: '24%' }} />
          </div>
        </div>

        {/* Files list */}
        <div className="space-y-2">
          {filtered.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${f.color}20`, color: f.color }}
              >
                {ICON_MAP[f.type] || <FileText size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{f.name}</p>
                <p className="text-white/40 text-xs mt-0.5">{f.size} · {f.date}</p>
              </div>
              <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/30">
                <MoreVertical size={14} />
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-white/40">
            <Folder size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد ملفات</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
