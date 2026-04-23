'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Sparkles, CheckSquare, Video, Users, TrendingUp,
  Briefcase, ArrowUpRight, Receipt, BookOpen, MessageSquare,
  Phone, Zap, ChevronLeft,
} from 'lucide-react';

// ═══ Data ═══════════════════════════════════════════════════════════════════

const SERVICES = [
  { icon: Sparkles,      title: 'مساعد AI ذكي',     desc: 'يحلّل، يلخّص، ويقترح خطوتك التالية',  color: '#8B5CF6' },
  { icon: Receipt,       title: 'شكرة — محاسب AI',  desc: 'صوّر الفاتورة، يسجّلها تلقائياً',       color: '#10B981' },
  { icon: CheckSquare,   title: 'مهام ومشاريع',     desc: 'Kanban وقوائم لكل الفريق',             color: '#2E8BFF' },
  { icon: TrendingUp,    title: 'CRM وصفقات',       desc: 'تتبّع العملاء وخط الصفقات',            color: '#FFB24D' },
  { icon: Video,         title: 'اجتماعات مدمجة',   desc: 'غرفة فيديو لكل شركة بدون إعداد',       color: '#14E0A4' },
  { icon: Users,         title: 'إدارة الفريق',      desc: 'أدوار، صلاحيات، هيكل تنظيمي',         color: '#A78BFA' },
  { icon: Briefcase,     title: 'تسليمات ذكية',     desc: 'AI يلخّص الشغل للمستلم تلقائياً',      color: '#FF4757' },
  { icon: BookOpen,      title: 'قاعدة المعرفة',    desc: 'وثائق الشركة مع بحث ذكي',              color: '#00D4FF' },
];

const STATS = [
  { value: '٧', label: 'خدمات متكاملة', suffix: '+' },
  { value: '١٤', label: 'يوم تجربة مجانية', suffix: '' },
  { value: '٨٥', label: 'توفير عن المنافسين', suffix: '%' },
  { value: '٢٤/٧', label: 'مساعد AI متاح', suffix: '' },
];

const SHUKRA_STEPS = [
  { num: '١', icon: '📸', title: 'صوّر الفاتورة', desc: 'أو اكتب المعاملة نصاً على تلغرام' },
  { num: '٢', icon: '🤖', title: 'شكرة يقرأها', desc: 'Claude يستخرج المبلغ، العملة، التاريخ، الجهة' },
  { num: '٣', icon: '📊', title: 'يسجّل تلقائياً', desc: 'يُضاف للـGoogle Sheet الاحترافي فوراً' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

// ═══ Main Component ══════════════════════════════════════════════════════════

export default function LandingIntro() {
  return (
    <main className="relative min-h-screen bg-[#07070f] text-white overflow-x-hidden" dir="rtl">

      {/* ── Nav ── */}
      <header className="fixed top-0 inset-x-0 z-50 px-5 lg:px-10 py-4 flex items-center justify-between backdrop-blur-md bg-[#07070f]/80 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/10">
            <Image src="/icon.png" alt="ALLOUL&Q" width={32} height={32} />
          </div>
          <span className="font-black text-base tracking-tight">
            ALLOUL<span className="text-[#00D4FF]">&Q</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm text-white/60">
          <a href="#services" className="hover:text-white transition-colors">الخدمات</a>
          <a href="#shukra" className="hover:text-white transition-colors">شكرة</a>
          <a href="#ai" className="hover:text-white transition-colors">الذكاء</a>
          <Link href="/pricing" className="hover:text-white transition-colors">الأسعار</Link>
        </nav>

        <Link
          href="/login"
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-bold"
        >
          دخول / تسجيل
        </Link>
      </header>

      {/* ── Sections ── */}
      <Hero />
      <ServicesSection />
      <ShukraSection />
      <AISection />
      <StatsSection />
      <CTASection />

      <footer className="border-t border-white/5 py-8 text-center text-white/30 text-xs">
        © 2026 ALLOUL&Q · منصة الأعمال الذكية
      </footer>
    </main>
  );
}

// ═══ 1. Hero ═════════════════════════════════════════════════════════════════

function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-5 pt-28 pb-16 text-center overflow-hidden">

      {/* Background glows — CSS only, no JS */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#2E8BFF]/10 blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[#14E0A4]/8 blur-[100px] -z-10 pointer-events-none" />

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2E8BFF]/10 border border-[#2E8BFF]/30 text-[#00D4FF] text-xs font-bold mb-8"
      >
        <Sparkles size={11} />
        منصة الأعمال الذكية · مدعومة بـ Claude
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        className="font-black leading-[1.0] tracking-tight text-[clamp(2.8rem,8vw,7rem)] max-w-4xl mb-5"
      >
        الذكاء الذي
        <br />
        <span className="bg-gradient-to-l from-[#2E8BFF] via-[#00D4FF] to-[#14E0A4] bg-clip-text text-transparent">
          يدير شركتك
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.7 }}
        className="text-base md:text-lg text-white/55 max-w-xl mb-10"
      >
        مهام، محاسبة، اجتماعات، CRM، ومساعد AI — كل خدمات شركتك في مكان واحد بسعر أرخص من تطبيق واحد.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="flex flex-wrap items-center justify-center gap-3 mb-16"
      >
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-l from-[#2E8BFF] to-[#00D4FF] text-white font-bold text-sm shadow-lg shadow-[#2E8BFF]/30 hover:shadow-[#2E8BFF]/50 hover:scale-[1.02] transition-all"
        >
          ابدأ التجربة المجانية
          <ArrowUpRight size={16} />
        </Link>
        <Link
          href="#services"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-colors"
        >
          استكشف الخدمات
          <ChevronLeft size={16} className="text-white/50" />
        </Link>
      </motion.div>

      {/* Floating service cards preview */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 1.1 }}
        className="w-full max-w-3xl"
      >
        <div className="relative rounded-2xl border border-white/8 bg-white/[0.03] p-4 backdrop-blur-sm">
          {/* Window dots */}
          <div className="flex gap-1.5 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF4757]/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#FFB24D]/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#14E0A4]/70" />
          </div>

          {/* Mini dashboard preview */}
          <div className="grid grid-cols-4 gap-2">
            {SERVICES.slice(0, 4).map((s, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl"
                style={{ background: `${s.color}10`, border: `1px solid ${s.color}20` }}
              >
                <s.icon size={18} style={{ color: s.color }} />
                <span className="text-[10px] text-white/60 text-center leading-tight">{s.title}</span>
              </div>
            ))}
          </div>

          {/* Fake stat bar */}
          <div className="mt-3 flex items-center gap-3 px-2">
            <div className="flex-1 h-1 rounded-full bg-white/5">
              <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#2E8BFF] to-[#14E0A4]" />
            </div>
            <span className="text-[10px] text-white/30">٧٢٪ إنجاز المشاريع</span>
          </div>
        </div>
      </motion.div>

    </section>
  );
}

// ═══ 2. Services ─────────────────────────────────────────────────────────────

function ServicesSection() {
  return (
    <section id="services" className="py-24 px-5 lg:px-10 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp}
        className="mb-14 max-w-2xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-px bg-[#00D4FF]" />
          <span className="text-[#00D4FF] text-xs font-bold uppercase tracking-widest">الخدمات</span>
        </div>
        <h2 className="font-black text-[clamp(1.8rem,4.5vw,3.8rem)] leading-[1.1] mb-4">
          كل ما يحتاجه فريقك
          <br />
          <span className="text-white/40">في مكان واحد</span>
        </h2>
        <p className="text-white/50 text-base">
          بدل ما تدفع $88/شخص لـ7 تطبيقات منفصلة — ادفع $7.5 للكل هنا.
        </p>
      </motion.div>

      {/* Grid */}
      <motion.div
        initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }}
        variants={stagger}
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {SERVICES.map((s) => (
          <motion.div
            key={s.title}
            variants={fadeUp}
            className="group p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] cursor-default"
            style={{
              borderColor: `${s.color}18`,
              background: `linear-gradient(135deg, ${s.color}08, rgba(255,255,255,0.01))`,
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
              style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}
            >
              <s.icon size={22} style={{ color: s.color }} />
            </div>
            <h3 className="font-bold text-base mb-1.5">{s.title}</h3>
            <p className="text-xs text-white/45 leading-relaxed">{s.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ═══ 3. شكرة Section ─────────────────────────────────────────────────────────

function ShukraSection() {
  return (
    <section id="shukra" className="py-24 px-5 lg:px-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/25 text-[#10B981] text-xs font-bold mb-5">
            <Receipt size={12} />
            شكرة — المحاسب الذكي
          </div>
          <h2 className="font-black text-[clamp(1.8rem,4.5vw,3.8rem)] leading-[1.1] mb-4">
            محاسبتك على تلغرام
            <br />
            <span className="bg-gradient-to-l from-[#10B981] to-[#00D4FF] bg-clip-text text-transparent">
              بدون محاسب
            </span>
          </h2>
          <p className="text-white/50 text-base max-w-lg mx-auto">
            أرسل صورة فاتورة أو اكتب "اشتريت سيارة بـ 50,000 ريال" — شكرة يسجّل كل شيء تلقائياً.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="grid md:grid-cols-3 gap-5 mb-16"
        >
          {SHUKRA_STEPS.map((step) => (
            <motion.div
              key={step.num}
              variants={fadeUp}
              className="relative p-6 rounded-2xl border border-[#10B981]/15 bg-[#10B981]/5"
            >
              <div className="text-3xl mb-4">{step.icon}</div>
              <div className="absolute top-5 left-5 w-6 h-6 rounded-full bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center text-[10px] font-black text-[#10B981]">
                {step.num}
              </div>
              <h3 className="font-bold text-base mb-1.5">{step.title}</h3>
              <p className="text-xs text-white/45 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Demo card — Telegram mockup */}
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="grid lg:grid-cols-2 gap-8 items-center"
        >
          {/* Left: Telegram chat mockup */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
            {/* Telegram header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-white/[0.02]">
              <div className="w-9 h-9 rounded-full bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center">
                <Receipt size={16} className="text-[#10B981]" />
              </div>
              <div>
                <p className="text-sm font-bold">شكرة Bot</p>
                <p className="text-[11px] text-[#10B981]">● متصل</p>
              </div>
            </div>

            {/* Messages */}
            <div className="p-5 space-y-4">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-[#2E8BFF]/25 border border-[#2E8BFF]/20 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-sm">
                  اشتريت لابتوب Dell بـ 3500 دولار
                </div>
              </div>

              {/* Bot processing */}
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%] text-sm">
                  ⏳ جاري تسجيل المعاملة...
                </div>
              </div>

              {/* Bot result */}
              <div className="flex justify-start">
                <div className="bg-[#10B981]/10 border border-[#10B981]/20 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] text-sm space-y-1.5">
                  <p className="font-bold text-[#10B981]">✅ تم التسجيل في Google Sheet</p>
                  <p className="text-white/70">📉 مصروف</p>
                  <p className="text-white/70">💰 3,500 USD</p>
                  <p className="text-white/70">🏪 Dell</p>
                  <p className="text-white/70">📂 مشتريات</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Google Sheet mockup */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
            {/* Sheet header */}
            <div className="px-5 py-4 border-b border-white/5 bg-[#10B981]/8">
              <p className="text-sm font-bold text-[#10B981]">📉 سجل المشتريات</p>
              <p className="text-[11px] text-white/40 mt-0.5">يُحدَّث تلقائياً من شكرة</p>
            </div>

            {/* Table */}
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-white/30 border-b border-white/5">
                    <th className="text-right py-2 pr-2 font-semibold">التاريخ</th>
                    <th className="text-right py-2 font-semibold">المبلغ</th>
                    <th className="text-right py-2 font-semibold">الجهة</th>
                    <th className="text-right py-2 font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  {[
                    { date: '2026-04-23', amount: '3,500 USD', vendor: 'Dell', status: 'مدفوع', color: '#10B981' },
                    { date: '2026-04-20', amount: '20,000 AED', vendor: 'مرسيدس', status: 'مدفوع', color: '#10B981' },
                    { date: '2026-04-18', amount: '1,200 SAR', vendor: 'STC', status: 'معلق', color: '#FFB24D' },
                  ].map((row, i) => (
                    <tr key={i} className={`border-b border-white/4 ${i === 0 ? 'bg-[#10B981]/8' : ''}`}>
                      <td className="py-2 pr-2 text-white/60">{row.date}</td>
                      <td className="py-2 text-white font-semibold">{row.amount}</td>
                      <td className="py-2 text-white/70">{row.vendor}</td>
                      <td className="py-2">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ color: row.color, background: `${row.color}18` }}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary row */}
              <div className="mt-3 flex items-center justify-between pt-3 border-t border-white/5">
                <span className="text-[11px] text-white/40">إجمالي المصروفات:</span>
                <span className="text-sm font-black text-white">$24,700</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ═══ 4. AI Showcase ──────────────────────────────────────────────────────────

function AISection() {
  const features = [
    'أولويات اليوم من بين عشرات المهام',
    'تلخيص التسليمات للمستلم الجديد',
    'تحليل الصفقات وخط الأنابيب',
    'ملاحظات الاجتماعات تلقائياً',
  ];

  return (
    <section id="ai" className="py-24 px-5 lg:px-10 max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-12 items-center">

        {/* Left: Text */}
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-6 h-px bg-[#8B5CF6]" />
            <span className="text-[#8B5CF6] text-xs font-bold uppercase tracking-widest">المساعد الذكي</span>
          </div>

          <h2 className="font-black text-[clamp(1.8rem,4vw,3.5rem)] leading-[1.1] mb-5">
            ذكاء حقيقي
            <br />
            <span className="bg-gradient-to-l from-[#8B5CF6] to-[#00D4FF] bg-clip-text text-transparent">
              ليس مجرد دردشة
            </span>
          </h2>

          <p className="text-white/50 text-base mb-8 leading-relaxed">
            المساعد يعرف شركتك — يقرأ مهامك، يحلّل تسليماتك، ويقترح خطوتك التالية بكل ذكاء Claude.
          </p>

          <ul className="space-y-3 mb-8">
            {features.map((f, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.09 }}
                className="flex items-center gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center flex-shrink-0">
                  <Zap size={10} className="text-[#8B5CF6]" />
                </div>
                <span className="text-sm text-white/70">{f}</span>
              </motion.li>
            ))}
          </ul>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[#8B5CF6] font-bold text-sm hover:gap-3 transition-all"
          >
            جرّب المساعد الآن
            <ArrowUpRight size={16} />
          </Link>
        </motion.div>

        {/* Right: Chat mockup */}
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-white/[0.02]">
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/10">
                <Image src="/icon.png" alt="AI" width={32} height={32} />
              </div>
              <div>
                <p className="text-sm font-bold">ALLOUL AI</p>
                <p className="text-[11px] text-[#8B5CF6]">مساعد شركتك</p>
              </div>
            </div>

            {/* Chat */}
            <div className="p-5 space-y-4">
              <div className="flex justify-end">
                <div className="bg-[#2E8BFF]/20 border border-[#2E8BFF]/20 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-sm">
                  ما أولويات اليوم؟
                </div>
              </div>

              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[88%] text-sm space-y-2">
                  <p className="font-bold text-[#8B5CF6] mb-2">أولوياتك اليوم:</p>
                  <div className="space-y-1.5 text-white/70">
                    <p>⚡ مراجعة عرض العميل — تأخّر يومين</p>
                    <p>📊 اجتماع التسويق الساعة ١١</p>
                    <p>✅ تسليم مشروع API قبل الجمعة</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="bg-[#2E8BFF]/20 border border-[#2E8BFF]/20 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-sm">
                  لخّص آخر تسليم
                </div>
              </div>

              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[80%] text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse" />
                  <span className="text-white/50">يفكّر...</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ═══ 5. Stats ────────────────────────────────────────────────────────────────

function StatsSection() {
  return (
    <section className="py-16 px-5 border-y border-white/5">
      <motion.div
        initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }}
        variants={stagger}
        className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6"
      >
        {STATS.map((s) => (
          <motion.div key={s.label} variants={fadeUp} className="text-center">
            <p className="font-black text-[clamp(2rem,5vw,3.5rem)] bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent leading-none mb-2">
              {s.value}<span className="text-[#00D4FF]">{s.suffix}</span>
            </p>
            <p className="text-xs text-white/40">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ═══ 6. CTA ──────────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="py-32 px-5 text-center relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#2E8BFF]/8 blur-[100px] pointer-events-none" />
      </div>

      <motion.div
        initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }}
        variants={fadeUp}
        className="max-w-3xl mx-auto"
      >
        <h2 className="font-black text-[clamp(2.2rem,6vw,5.5rem)] leading-[1.0] mb-6">
          جاهز لتحويل
          <br />
          <span className="bg-gradient-to-l from-[#2E8BFF] via-[#00D4FF] to-[#14E0A4] bg-clip-text text-transparent">
            طريقة عملك؟
          </span>
        </h2>

        <p className="text-white/50 text-base mb-10">
          ١٤ يوم تجربة مجانية على Professional · بدون بطاقة ائتمان · إلغاء في أي وقت
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-l from-[#2E8BFF] to-[#00D4FF] text-white font-bold text-base shadow-lg shadow-[#2E8BFF]/30 hover:shadow-[#2E8BFF]/50 hover:scale-[1.03] transition-all"
          >
            ابدأ تجربتك المجانية
            <ArrowUpRight size={18} />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-white/10 text-white/70 font-bold text-base hover:border-white/20 hover:text-white transition-colors"
          >
            عرض الأسعار
          </Link>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-5 mt-10 text-xs text-white/25">
          <span className="flex items-center gap-1.5"><MessageSquare size={12} />دعم عربي</span>
          <span className="flex items-center gap-1.5"><Phone size={12} />iOS + Android</span>
          <span className="flex items-center gap-1.5"><Zap size={12} />Claude AI</span>
        </div>
      </motion.div>
    </section>
  );
}
