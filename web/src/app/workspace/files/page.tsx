'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, Image, Film, Archive, Upload, Search, X, Loader2, FolderOpen, ExternalLink } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { uploadFile } from '@/lib/api-client';

interface UploadedFile {
  name: string;
  url: string;
  type: string;
  size: string;
  date: string;
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return { icon: <Image size={20} />, color: '#14E0A4' };
  if (['mp4','mov','avi','webm'].includes(ext))               return { icon: <Film size={20} />,  color: '#8B5CF6' };
  if (['zip','rar','7z','tar'].includes(ext))                 return { icon: <Archive size={20} />, color: '#FFB24D' };
  return { icon: <FileText size={20} />, color: '#2E8BFF' };
}

function fileSize(bytes: number) {
  if (bytes < 1024)       return bytes + ' B';
  if (bytes < 1048576)    return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function FilesPage() {
  const [query, setQuery]       = useState('');
  const [files, setFiles]       = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = files.filter(f => !query || f.name.toLowerCase().includes(query.toLowerCase()));

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const res = await uploadFile(file);
        const { icon: _, color: __ } = fileIcon(file.name);
        setFiles(prev => [{
          name:  res.filename || file.name,
          url:   res.url,
          type:  file.type,
          size:  fileSize(file.size),
          date:  'الآن',
        }, ...prev]);
      }
    } catch (e: any) {
      setError(e?.message || 'فشل رفع الملف');
    }
    setUploading(false);
  }

  return (
    <AppShell>
      <header className="sticky top-0 z-20 glass-chrome px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5 text-white/70">
            <ArrowRight size={18} />
          </Link>
          <h1 className="text-white font-black text-[17px] flex-1">الملفات</h1>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            رفع ملف
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => handleUpload(e.target.files)}
          />
        </div>
        <div className="relative">
          <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ابحث في الملفات..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary/40"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2">
              <X size={13} className="text-white/30" />
            </button>
          )}
        </div>
      </header>

      <div className="px-4 py-4 pb-24">
        {/* Drop zone hint */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 py-6 mb-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
        >
          <Upload size={20} className="text-white/30" />
          <p className="text-white/40 text-xs font-medium">اسحب ملفات هنا أو اضغط للرفع</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-bold">
            <X size={13} /> {error}
          </div>
        )}

        {files.length === 0 && !uploading && (
          <div className="text-center py-16 text-white/40">
            <FolderOpen size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">لا توجد ملفات مرفوعة بعد</p>
            <p className="text-xs mt-1 opacity-60">ارفع ملفاتك لتظهر هنا</p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((f, i) => {
            const { icon, color } = fileIcon(f.name);
            return (
              <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}20`, color }}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{f.name}</p>
                  <p className="text-white/40 text-xs mt-0.5">{f.size} · {f.date}</p>
                </div>
                <a href={f.url} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors">
                  <ExternalLink size={14} />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
