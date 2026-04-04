import React, { useState } from 'react';
import { CompanyTabId, CompanyModuleId } from '../../types';
import { 
  LayoutDashboard, 
  Grid3X3, 
  Users, 
  Settings, 
  ChevronLeft, 
  Bell, 
  Search,
  Briefcase,
  FileText,
  MessageSquare,
  CheckSquare,
  BarChart3,
  Users2,
  Calendar,
  ShieldCheck,
  ArrowUpRight,
  Clock,
  Inbox,
  MoreHorizontal,
  Plus,
  User,
  Sparkles,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { ModuleRenderer } from './modules/ModuleRenderer';
import { SmartLogo } from '../../components/Branding/SmartLogo';

export function CompanyApp() {
  const [activeTab, setActiveTab] = useState<CompanyTabId>('dashboard');
  const [activeModule, setActiveModule] = useState<CompanyModuleId | null>(null);
  const { activeCompany } = useApp();

  const renderTab = () => {
    if (activeModule) {
      return <ModuleRenderer moduleId={activeModule} onBack={() => setActiveModule(null)} />;
    }

    switch (activeTab) {
      case 'dashboard': return <CompanyDashboard onModuleSelect={setActiveModule} />;
      case 'approvals': return <CompanyApprovals />;
      case 'services': return <ServicesHub onModuleSelect={setActiveModule} />;
      case 'feed': return <CompanyInternalFeed />;
      case 'more': return <CompanyMore />;
      default: return <CompanyDashboard onModuleSelect={setActiveModule} />;
    }
  };

  const handleTabChange = (tab: CompanyTabId) => {
    setActiveTab(tab);
    setActiveModule(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-right" dir="rtl">
      {/* Company Header */}
      {!activeModule && (
        <header className="h-24 border-b border-white/5 flex items-center justify-between px-8 sticky top-0 glass-dark z-30">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-[20px] glass flex items-center justify-center border border-white/10 shadow-2xl -rotate-3 group hover:rotate-0 transition-all duration-500">
                <img src={activeCompany?.logo} className="w-11 h-11 rounded-[14px] object-cover shadow-lg" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em]">{activeCompany?.role}</p>
                </div>
              </div>
            </div>
            
            <div className="h-10 w-px bg-white/10 hidden md:block" />
            
            <SmartLogo size="sm" className="hidden md:flex" />
          </div>
          <div className="flex items-center gap-4">
            <button className="w-11 h-11 glass rounded-2xl transition-all hover:scale-110 text-white/40 hover:text-white flex items-center justify-center hover:glow-blue">
              <Search size={22} />
            </button>
            <button className="w-11 h-11 glass rounded-2xl transition-all hover:scale-110 text-white/40 hover:text-white relative flex items-center justify-center hover:glow-blue">
              <Bell size={22} />
              <span className="absolute top-2.5 right-2.5 w-3 h-3 bg-[#0066FF] rounded-full border-2 border-[#050505] glow-blue shadow-lg" />
            </button>
          </div>
        </header>
      )}

      {/* Content */}
      <main className={`flex-1 overflow-y-auto hide-scrollbar ${activeModule ? '' : 'pb-24'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModule ? activeModule : activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-full"
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Company Navigation */}
      {!activeModule && (
        <nav className="fixed bottom-8 left-8 right-8 h-24 glass-dark rounded-[40px] flex items-center justify-around px-6 z-40 border-white/10 shadow-2xl hover:border-white/20 transition-all duration-500">
          <CompanyNavButton active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} icon={LayoutDashboard} label="الرئيسية" />
          <CompanyNavButton active={activeTab === 'approvals'} onClick={() => handleTabChange('approvals')} icon={Inbox} label="الموافقات" />
          <CompanyNavButton active={activeTab === 'services'} onClick={() => handleTabChange('services')} icon={Grid3X3} label="الخدمات" />
          <CompanyNavButton active={activeTab === 'feed'} onClick={() => handleTabChange('feed')} icon={MessageSquare} label="الإعلانات" />
          <CompanyNavButton active={activeTab === 'more'} onClick={() => handleTabChange('more')} icon={MoreHorizontal} label="المزيد" />
        </nav>
      )}
    </div>
  );
}

function CompanyNavButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group py-2 flex-1">
      <div className={`w-12 h-12 rounded-2xl transition-all duration-500 flex items-center justify-center ${
        active ? 'bg-white text-black shadow-2xl scale-110 rotate-3' : 'text-white/20 group-hover:text-white/50 group-hover:bg-white/5'
      }`}>
        <Icon size={24} strokeWidth={active ? 2.5 : 2} />
      </div>
      <span className={`text-[9px] font-black uppercase tracking-widest transition-all duration-500 ${active ? 'text-white opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
        {label}
      </span>
    </button>
  );
}

function CompanyDashboard({ onModuleSelect }: { onModuleSelect: (id: CompanyModuleId) => void }) {
  return (
    <div className="p-6 space-y-8">
      {/* AI Smart Insight Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bento-card p-5 bg-gradient-to-r from-[#0066FF]/10 via-[#0066FF]/5 to-transparent border-[#0066FF]/20 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0066FF]/10 blur-[50px] -mr-16 -mt-16 animate-pulse" />
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-[#0066FF] flex items-center justify-center shadow-lg shadow-[#0066FF]/40 shrink-0">
            <Sparkles size={24} className="text-white animate-pulse" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#0066FF] uppercase tracking-[0.3em]">Alloul&Q Insight</span>
              <div className="h-px flex-1 bg-gradient-to-r from-[#0066FF]/20 to-transparent" />
            </div>
            <h3 className="text-sm font-bold text-white leading-tight">تحليل الأداء اليومي الذكي</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              بناءً على نشاط اليوم، نلاحظ تقدماً ملحوظاً في <span className="text-white font-bold">مشروع الهوية البصرية</span>. ننصح بجدولة اجتماع مع فريق المبيعات لمراجعة <span className="text-[#0066FF] font-bold">4 فرص جديدة</span> ظهرت في نظام CRM.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Executive Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bento-card p-5 bg-gradient-to-br from-white/5 to-transparent border-white/5 group hover:glow-blue transition-all duration-500">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 glass rounded-xl text-white/40 group-hover:text-white transition-colors">
              <Briefcase size={16} />
            </div>
            <span className="text-[9px] font-black text-emerald-400 flex items-center gap-1 bg-emerald-400/10 px-2 py-0.5 rounded-full">
              <ArrowUpRight size={10} />
              +12%
            </span>
          </div>
          <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">المشاريع النشطة</div>
          <div className="text-2xl font-black text-white tracking-tighter">24</div>
        </div>
        <div className="bento-card p-5 bg-gradient-to-br from-white/5 to-transparent border-white/5 group hover:glow-blue transition-all duration-500">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 glass rounded-xl text-white/40 group-hover:text-white transition-colors">
              <Clock size={16} />
            </div>
            <span className="text-[9px] font-black text-[#0066FF] flex items-center gap-1 bg-[#0066FF]/10 px-2 py-0.5 rounded-full">
              <ArrowUpRight size={10} />
              +5%
            </span>
          </div>
          <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">ساعات العمل</div>
          <div className="text-2xl font-black text-white tracking-tighter">1,420</div>
        </div>
      </div>

      {/* Quick Actions Hub */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mr-2">إجراءات سريعة</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Sparkles, label: 'Alloul&Q', id: 'ai' as CompanyModuleId },
            { icon: Award, label: 'السلم الوظيفي', id: 'career' as CompanyModuleId },
            { icon: FileText, label: 'تقرير', id: 'reports' as CompanyModuleId },
            { icon: Users2, label: 'فريق', id: 'teams' as CompanyModuleId },
          ].map((action, i) => (
            <button 
              key={i} 
              onClick={() => onModuleSelect(action.id)}
              className="bento-card p-3 flex flex-col items-center gap-2 hover:bg-white/5 transition-all group border-white/5"
            >
              <div className="w-10 h-10 rounded-xl glass flex items-center justify-center text-white/40 group-hover:text-white transition-all group-hover:scale-110">
                <action.icon size={18} />
              </div>
              <span className="text-[7px] font-black uppercase tracking-widest text-center leading-tight text-white/60 group-hover:text-white">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Handover Continuity (Operational Focus) */}
      <div className="bento-card border-white/5 overflow-hidden">
        <button 
          onClick={() => onModuleSelect('handover')}
          className="w-full p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01] hover:bg-white/[0.03] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#0066FF]/10 text-[#0066FF]">
              <ShieldCheck size={18} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white">استمرارية العمل (Handover)</h3>
          </div>
          <ChevronLeft size={16} className="text-white/20" />
        </button>
        <div className="divide-y divide-white/5">
          {[
            { title: 'مشروع ألّول ون', owner: 'أحمد خالد', status: 'نشط', progress: 75 },
            { title: 'تحديثات الخادم الرئيسي', owner: 'نظام آلي', status: 'مكتمل', progress: 100 },
            { title: 'مراجعة التصاميم الجديدة', owner: 'سارة محمد', status: 'قيد المراجعة', progress: 40 },
          ].map((item, i) => (
            <div key={i} className="p-5 space-y-3 hover:bg-white/[0.02] transition-colors">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">{item.title}</div>
                  <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">المسؤول: {item.owner}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                  item.status === 'مكتمل' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {item.status}
                </span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all duration-1000" style={{ width: `${item.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ServicesHub({ onModuleSelect }: { onModuleSelect: (id: CompanyModuleId) => void }) {
  const categories = [
    {
      title: 'التعاون والتواصل',
      items: [
        { icon: Users2, label: 'الفرق', desc: 'إدارة الأقسام والموظفين', id: 'teams' as CompanyModuleId },
        { icon: MessageSquare, label: 'المحادثات', desc: 'تواصل داخلي آمن', id: 'chat' as CompanyModuleId },
        { icon: Calendar, label: 'الاجتماعات', desc: 'جدولة ومحاضر الاجتماعات', id: 'meetings' as CompanyModuleId },
      ]
    },
    {
      title: 'العمليات والاستمرارية',
      items: [
        { icon: ShieldCheck, label: 'التسليم (Handover)', desc: 'ضمان انتقال المسؤوليات', id: 'handover' as CompanyModuleId },
        { icon: FileText, label: 'الملفات', desc: 'مستودع المستندات الرسمي', id: 'files' as CompanyModuleId },
        { icon: CheckSquare, label: 'الموافقات', desc: 'إدارة تدفق العمل', id: 'approvals' as CompanyModuleId },
      ]
    },
    {
      title: 'الأعمال والذكاء',
      items: [
        { icon: BarChart3, label: 'التقارير', desc: 'تحليلات الأداء المؤسسي', id: 'reports' as CompanyModuleId },
        { icon: Briefcase, label: 'المشاريع', desc: 'تتبع المهام والخطط', id: 'projects' as CompanyModuleId },
        { icon: User, label: 'العملاء (CRM)', desc: 'إدارة المبيعات والفرص', id: 'crm' as CompanyModuleId },
      ]
    }
  ];

  return (
    <div className="p-6 space-y-10">
      {categories.map((cat, i) => (
        <div key={i} className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mr-2">{cat.title}</h3>
          <div className="grid grid-cols-1 gap-3">
            {cat.items.map((item, j) => (
              <button 
                key={j} 
                onClick={() => onModuleSelect(item.id)}
                className="bento-card p-5 flex items-center gap-5 hover:bg-white/5 transition-all group text-right"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-white/10 group-hover:text-white transition-all">
                  <item.icon size={24} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-black text-white">{item.label}</div>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">{item.desc}</p>
                </div>
                <ChevronLeft size={18} className="text-white/10 group-hover:text-white transition-all" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CompanyApprovals() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-white">الموافقات المعلقة</h2>
        <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black text-white">4 طلبات</span>
      </div>
      
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bento-card p-5 space-y-4 border-white/5">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">طلب شراء معدات تقنية</div>
                  <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">قسم التقنية · منذ 2س</div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button className="flex-1 py-2.5 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all">
                موافقة
              </button>
              <button className="flex-1 py-2.5 bg-white/5 text-white/60 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                رفض
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompanyInternalFeed() {
  return (
    <div className="p-6 space-y-6">
      <div className="bento-card p-6 bg-gradient-to-br from-[#0066FF]/10 to-transparent border-[#0066FF]/20">
        <h3 className="text-sm font-black text-white mb-2">إعلان رسمي من الإدارة</h3>
        <p className="text-xs text-white/60 leading-relaxed">
          سيتم تحديث أنظمة الشركة الداخلية يوم الجمعة القادم. يرجى التأكد من حفظ جميع الأعمال المعلقة.
        </p>
      </div>
      
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bento-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/5" />
              <div className="text-xs font-bold text-white">قسم الموارد البشرية</div>
            </div>
            <p className="text-sm text-white/80">نرحب بالزملاء الجدد المنضمين لفريق التطوير هذا الأسبوع! 🎉</p>
            <div className="text-[9px] text-white/20 font-bold uppercase tracking-widest">منذ 5س</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompanyMore() {
  return (
    <div className="p-6 space-y-8">
      <div className="bento-card p-6 flex items-center gap-4">
        <img src="https://picsum.photos/seed/alloul/100/100" className="w-16 h-16 rounded-2xl object-cover" />
        <div>
          <h3 className="text-lg font-black text-white">محمد ألّول</h3>
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest">المدير التنفيذي</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mr-2">إعدادات المؤسسة</h3>
        <div className="bento-card divide-y divide-white/5">
          {['إدارة الأدوار', 'سجل النشاطات', 'الأمان والخصوصية', 'الفواتير والاشتراك'].map((item, i) => (
            <button key={i} className="w-full p-5 flex items-center justify-between hover:bg-white/[0.02] transition-all group">
              <span className="text-sm font-bold text-white/80 group-hover:text-white">{item}</span>
              <ChevronLeft size={16} className="text-white/10 group-hover:text-white" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
