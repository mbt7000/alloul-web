'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, CheckSquare, RefreshCw,
  Video, MessageSquare, Users, TrendingUp, BarChart3,
  BookOpen, Key, UserPlus, Inbox, Sparkles, Search,
  Folder, FileText, Zap, Globe, Shield, Phone,
  PieChart, Calendar, Bell, Briefcase, Database,
  Mail, Target, Cpu, Star,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { isAuthenticated } from '@/lib/auth';

interface Service {
  key: string;
  icon: any;
  label: string;
  sub: string;
  route: string;
  color: string;
  badge?: string;
}

interface Category {
  title: string;
  emoji: string;
  items: Service[];
}

const FEATURED: Service[] = [
  { key: 'ai',     icon: Sparkles,      label: 'ALLOUL Agent', sub: 'AI ذكي خاص',     route: '/workspace/ai',      color: '#8B5CF6', badge: 'جديد' },
  { key: 'meet',   icon: Video,         label: 'اجتماعات',     sub: 'فيديو + صوت',    route: '/workspace/meetings', color: '#14E0A4' },
  { key: 'tasks',  icon: CheckSquare,   label: 'المهام',       sub: 'قوائم ذكية',     route: '/workspace/tasks',    color: '#2E8BFF' },
  { key: 'crm',    icon: TrendingUp,    label: 'CRM',          sub: 'إدارة الصفقات',  route: '/workspace/crm',      color: '#FFB24D' },
];

const CATEGORIES: Category[] = [
  {
    title: 'العمل والإنتاجية',
    emoji: '⚡',
    items: [
      { key: 'projects',  icon: Folder,       label: 'المشاريع',      sub: 'إدارة كاملة',       route: '/workspace/tasks',    color: '#00D4FF' },
      { key: 'tasks',     icon: CheckSquare,  label: 'المهام',        sub: 'قوائم وأولويات',    route: '/workspace/tasks',    color: '#2E8BFF' },
      { key: 'handover',  icon: RefreshCw,    label: 'التسليم',       sub: 'handover ذكي',      route: '/workspace/handover', color: '#FFB24D' },
      { key: 'knowledge', icon: BookOpen,     label: 'قاعدة المعرفة', sub: 'مستندات + بحث',    route: '/workspace/knowledge',color: '#A855F7' },
      { key: 'files',     icon: FileText,     label: 'الملفات',       sub: 'تخزين وتنظيم',      route: '/workspace/files',    color: '#6366F1' },
      { key: 'reports',   icon: BarChart3,    label: 'التقارير',      sub: 'إحصائيات الشركة',   route: '/workspace/reports',  color: '#14E0A4' },
    ],
  },
  {
    title: 'التواصل والتعاون',
    emoji: '💬',
    items: [
      { key: 'meetings',  icon: Video,        label: 'اجتماعات',      sub: 'جدولة وفيديو',      route: '/workspace/meetings', color: '#14E0A4' },
      { key: 'chat',      icon: MessageSquare,label: 'الدردشة',       sub: 'قنوات + شات',       route: '/messages',           color: '#00D4FF' },
      { key: 'calls',     icon: Phone,        label: 'المكالمات',     sub: 'صوت وفيديو',        route: '/workspace/calls',    color: '#22D3EE' },
      { key: 'team',      icon: Users,        label: 'الفريق',        sub: 'الموظفون والأدوار', route: '/workspace/team',     color: '#8B5CF6' },
      { key: 'calendar',  icon: Calendar,     label: 'الجدول الزمني', sub: 'مواعيد وأحداث',     route: '/workspace/meetings', color: '#F472B6' },
      { key: 'inbox',     icon: Inbox,        label: 'الصندوق',       sub: 'طلبات الموافقة',    route: '/workspace/inbox',    color: '#A3E635' },
    ],
  },
  {
    title: 'الإدارة والمبيعات',
    emoji: '📊',
    items: [
      { key: 'crm',       icon: TrendingUp,   label: 'CRM',           sub: 'خط أنابيب المبيعات', route: '/workspace/crm',      color: '#FFB24D' },
      { key: 'deals',     icon: Target,       label: 'الصفقات',       sub: 'تتبع وتحليل',       route: '/workspace/crm',      color: '#FB923C' },
      { key: 'hiring',    icon: UserPlus,     label: 'التوظيف',       sub: 'مرشحون ومقابلات',   route: '/workspace/hiring',   color: '#2E8BFF' },
      { key: 'analytics', icon: PieChart,     label: 'التحليلات',     sub: 'رؤى وبيانات',       route: '/workspace/reports',  color: '#06B6D4' },
      { key: 'roles',     icon: Key,          label: 'الأدوار',       sub: 'صلاحيات الوصول',    route: '/workspace/services', color: '#EC4899' },
      { key: 'approvals', icon: Shield,       label: 'الموافقات',     sub: 'سير العمل',         route: '/workspace/inbox',    color: '#84CC16' },
    ],
  },
  {
    title: 'الذكاء الاصطناعي',
    emoji: '🤖',
    items: [
      { key: 'ai',        icon: Sparkles,     label: 'ALLOUL Agent',  sub: 'مساعد خاص',         route: '/workspace/ai',       color: '#A855F7', badge: 'AI' },
      { key: 'search',    icon: Search,       label: 'البحث الذكي',   sub: 'بحث في كل شيء',    route: '/workspace/search',   color: '#00D4FF' },
      { key: 'workflows', icon: Zap,          label: 'الأتمتة',       sub: 'تدفقات العمل',      route: '/workspace/services', color: '#FDE047' },
      { key: 'insights',  icon: Cpu,          label: 'الرؤى الذكية',  sub: 'تحليل بالـ AI',     route: '/workspace/ai',       color: '#34D399' },
    ],
  },
  {
    title: 'التكاملات',
    emoji: '🔗',
    items: [
      { key: 'email',     icon: Mail,         label: 'البريد',        sub: 'Gmail / Outlook',   route: '/workspace/services', color: '#F87171' },
      { key: 'database',  icon: Database,     label: 'قاعدة البيانات', sub: 'استعلام مباشر',    route: '/workspace/ai',       color: '#818CF8' },
      { key: 'global',    icon: Globe,        label: 'الإنترنت',      sub: 'أدوات خارجية',      route: '/workspace/services', color: '#38BDF8' },
      { key: 'notify',    icon: Bell,         label: 'الإشعارات',     sub: 'تنبيهات ذكية',      route: '/workspace/services', color: '#FBBF24' },
    ],
  },
];

export default function WorkspaceServicesPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) router.replace('/login');
  }, [router]);

  const filteredCategories = CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (i) =>
        query === '' ||
        i.label.includes(query) ||
        i.sub.includes(query),
    ),
  })).filter((cat) => cat.items.length > 0);

  const visibleCategories = activeCategory
    ? filteredCategories.filter((c) => c.title === activeCategory)
    : filteredCategories;

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 glass-chrome px-4 py-3">
        <div className="flex items-center gap-4 mb-3">
          <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5 text-white/70">
            <ArrowRight size={18} />
          </Link>
          <h1 className="text-white font-black text-[17px]">الخدمات</h1>
          <span className="text-white/30 text-xs mr-auto">
            {CATEGORIES.reduce((n, c) => n + c.items.length, 0)} خدمة
          </span>
        </div>
        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن خدمة..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary/40"
          />
        </div>
      </header>

      <div className="px-4 py-4 pb-24 md:pb-10">

        {/* ─── Featured ──────────────────────────────────────────────── */}
        {!query && (
          <>
            <h3 className="text-white/60 text-xs font-black uppercase tracking-wider mb-3">الأكثر استخداماً</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {FEATURED.map((s) => (
                <ServiceCardLarge key={s.key} item={s} />
              ))}
            </div>
          </>
        )}

        {/* ─── Category pills ────────────────────────────────────────── */}
        {!query && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none mb-5">
            <button
              onClick={() => setActiveCategory(null)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                background: activeCategory === null ? 'rgba(46,139,255,0.25)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${activeCategory === null ? 'rgba(46,139,255,0.6)' : 'rgba(255,255,255,0.1)'}`,
                color: activeCategory === null ? '#2E8BFF' : 'rgba(255,255,255,0.5)',
              }}
            >
              الكل
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.title}
                onClick={() => setActiveCategory(c.title === activeCategory ? null : c.title)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap"
                style={{
                  background: activeCategory === c.title ? 'rgba(46,139,255,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${activeCategory === c.title ? 'rgba(46,139,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  color: activeCategory === c.title ? '#2E8BFF' : 'rgba(255,255,255,0.5)',
                }}
              >
                {c.emoji} {c.title}
              </button>
            ))}
          </div>
        )}

        {/* ─── Category sections ─────────────────────────────────────── */}
        {visibleCategories.map((cat) => (
          <div key={cat.title} className="mb-7">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">{cat.emoji}</span>
              <h3 className="text-white font-black text-sm">{cat.title}</h3>
              <span className="text-white/30 text-[10px]">{cat.items.length}</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {cat.items.map((s) => (
                <ServiceCard key={s.key} item={s} />
              ))}
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="text-center py-16 text-white/40">
            <Search size={32} className="mx-auto mb-3 opacity-40" />
            <p>لا توجد خدمات تطابق بحثك</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ─── Service Card (large — 2 cols) ────────────────────────────────────────────
function ServiceCardLarge({ item }: { item: Service }) {
  return (
    <Link
      href={item.route}
      className="group relative rounded-2xl border p-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{
        borderColor: `${item.color}33`,
        background: `linear-gradient(135deg, ${item.color}12, ${item.color}06)`,
        minHeight: 130,
      }}
    >
      {item.badge && (
        <span
          className="absolute top-3 left-3 text-[9px] font-black px-1.5 py-0.5 rounded-full"
          style={{ background: `${item.color}33`, color: item.color }}
        >
          {item.badge}
        </span>
      )}
      <div className="flex flex-col h-full justify-between">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `${item.color}22`, border: `1px solid ${item.color}44` }}
        >
          <item.icon size={20} style={{ color: item.color }} />
        </div>
        <div>
          <div className="text-white font-black text-sm mt-3">{item.label}</div>
          <div className="text-white/40 text-[11px] mt-0.5">{item.sub}</div>
        </div>
      </div>
    </Link>
  );
}

// ─── Service Card (small — 3 cols) ───────────────────────────────────────────
function ServiceCard({ item }: { item: Service }) {
  return (
    <Link
      href={item.route}
      className="group relative rounded-xl border p-3 transition-all hover:scale-[1.03] active:scale-[0.97] text-center flex flex-col items-center gap-2"
      style={{
        borderColor: 'rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.025)',
        minHeight: 92,
      }}
    >
      {item.badge && (
        <span
          className="absolute top-1.5 right-1.5 text-[8px] font-black px-1 py-0.5 rounded-full leading-none"
          style={{ background: `${item.color}33`, color: item.color }}
        >
          {item.badge}
        </span>
      )}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${item.color}18` }}
      >
        <item.icon size={16} style={{ color: item.color }} />
      </div>
      <div className="text-white font-bold text-[11px] leading-tight text-center">{item.label}</div>
    </Link>
  );
}
