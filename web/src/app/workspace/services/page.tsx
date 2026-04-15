'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, Folder, CheckSquare, RefreshCw, FolderOpen,
  Video, MessageSquare, Users,
  TrendingUp, BarChart3, BookOpen, Key, UserPlus, Inbox,
  Sparkles, Search,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { isAuthenticated } from '@/lib/auth';

interface Service {
  key: string;
  icon: any;
  label: string;
  route: string;
  color: string;
}
interface Category {
  title: string;
  items: Service[];
}

const FEATURED: Service[] = [
  { key: 'meet',  icon: Video,       label: 'اجتماعات',  route: '/workspace/meetings', color: '#14E0A4' },
  { key: 'tasks', icon: CheckSquare, label: 'المهام',    route: '/workspace/tasks',    color: '#2E8BFF' },
  { key: 'team',  icon: Users,       label: 'الفريق',    route: '/workspace/team',     color: '#8B5CF6' },
  { key: 'chat',  icon: MessageSquare, label: 'الدردشة', route: '/messages',           color: '#00D4FF' },
];

const CATEGORIES: Category[] = [
  {
    title: 'العمل والإنتاجية',
    items: [
      { key: 'projects', icon: Folder,     label: 'المشاريع', route: '/workspace/projects', color: '#00D4FF' },
      { key: 'tasks',    icon: CheckSquare,label: 'المهام',   route: '/workspace/tasks',    color: '#2E8BFF' },
      { key: 'handover', icon: RefreshCw,  label: 'التسليم',  route: '/workspace/handover', color: '#FFB24D' },
      { key: 'files',    icon: FolderOpen, label: 'الملفات',  route: '/workspace/files',    color: '#A855F7' },
    ],
  },
  {
    title: 'التواصل والتعاون',
    items: [
      { key: 'meet',  icon: Video,       label: 'اجتماعات', route: '/workspace/meetings', color: '#14E0A4' },
      { key: 'chat',  icon: MessageSquare, label: 'الدردشة', route: '/messages',           color: '#00D4FF' },
      { key: 'team',  icon: Users,       label: 'الفريق',    route: '/workspace/team',     color: '#8B5CF6' },
    ],
  },
  {
    title: 'الإدارة والتحليل',
    items: [
      { key: 'crm',      icon: TrendingUp, label: 'العملاء',  route: '/workspace/crm',     color: '#EC4899' },
      { key: 'reports',  icon: BarChart3,  label: 'التقارير', route: '/workspace/reports', color: '#FFB24D' },
      { key: 'knowledge',icon: BookOpen,   label: 'المعرفة',  route: '/workspace/knowledge',color: '#8B5CF6' },
      { key: 'roles',    icon: Key,        label: 'الأدوار',  route: '/workspace/roles',   color: '#14E0A4' },
      { key: 'hiring',   icon: UserPlus,   label: 'التوظيف',  route: '/workspace/hiring',  color: '#2E8BFF' },
      { key: 'approvals',icon: Inbox,      label: 'الموافقات',route: '/workspace/inbox',   color: '#00D4FF' },
    ],
  },
  {
    title: 'الذكاء والأتمتة',
    items: [
      { key: 'ai',     icon: Sparkles, label: 'المساعد AI', route: '/workspace/ai',     color: '#A855F7' },
      { key: 'search', icon: Search,   label: 'البحث',      route: '/workspace/search', color: '#00D4FF' },
    ],
  },
];

export default function WorkspaceServicesPage() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isAuthenticated()) router.replace('/login');
  }, [router]);

  const ServiceCard = ({ item, large }: { item: Service; large?: boolean }) => (
    <Link
      href={item.route}
      className="flex-1 rounded-[18px] border bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary/30 transition-all block group"
      style={{ borderColor: '#222', padding: large ? 18 : 14, minHeight: large ? 128 : 102 }}
    >
      <div className="flex flex-col h-full justify-between">
        <div
          className="rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
          style={{
            width: large ? 46 : 38,
            height: large ? 46 : 38,
            background: `${item.color}22`,
          }}
        >
          <item.icon size={large ? 22 : 18} style={{ color: item.color }} />
        </div>
        <div className="text-white font-bold mt-2.5" style={{ fontSize: large ? 14 : 13 }}>
          {item.label}
        </div>
      </div>
    </Link>
  );

  return (
    <AppShell>
      <header className="sticky top-0 z-20 bg-dark-bg-900/85 backdrop-blur-xl border-b border-primary/10 px-4 py-3 flex items-center gap-4">
        <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <ArrowRight size={18} />
        </Link>
        <h1 className="text-white font-black text-[17px]">الخدمات</h1>
      </header>

      <div className="px-4 py-5 pb-24 md:pb-10">
        {/* Featured */}
        <h3 className="text-white font-bold text-sm mb-3">الأكثر استخداماً</h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {FEATURED.map((s) => (
            <ServiceCard key={s.key} item={s} large />
          ))}
        </div>

        {/* Categories */}
        {CATEGORIES.map((cat) => {
          const isExpanded = expanded[cat.title] ?? false;
          const visible = isExpanded ? cat.items : cat.items.slice(0, 4);
          return (
            <div key={cat.title} className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-sm">{cat.title}</h3>
                <span className="text-[11px] text-white/40">{cat.items.length} خدمات</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {visible.map((s) => (
                  <ServiceCard key={s.key} item={s} />
                ))}
              </div>
              {cat.items.length > 4 && (
                <button
                  onClick={() => setExpanded((p) => ({ ...p, [cat.title]: !isExpanded }))}
                  className="w-full mt-2.5 py-2.5 rounded-xl text-accent text-xs font-bold bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]"
                >
                  {isExpanded ? 'عرض أقل' : `عرض المزيد (${cat.items.length - 4})`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
