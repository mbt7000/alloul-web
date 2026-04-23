'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import {
  Sparkles, CheckSquare, Video, Users, TrendingUp,
  Briefcase, ArrowUpRight, Receipt, BookOpen,
  MessageSquare, Phone, Zap, ChevronLeft,
} from 'lucide-react';

// ─── data ────────────────────────────────────────────────────────────────────

const SERVICES = [
  { icon: Sparkles,    title: 'مساعد AI ذكي',    desc: 'يحلّل، يلخّص، ويقترح خطوتك التالية',  color: '#8B5CF6', glow: '#8B5CF620' },
  { icon: Receipt,     title: 'شكرة — محاسب AI', desc: 'صوّر الفاتورة، يسجّلها تلقائياً',      color: '#10B981', glow: '#10B98120' },
  { icon: CheckSquare, title: 'مهام ومشاريع',    desc: 'Kanban وقوائم لكل الفريق',            color: '#2E8BFF', glow: '#2E8BFF20' },
  { icon: TrendingUp,  title: 'CRM وصفقات',      desc: 'تتبّع العملاء وخط الصفقات',           color: '#FFB24D', glow: '#FFB24D20' },
  { icon: Video,       title: 'اجتماعات مدمجة',  desc: 'غرفة فيديو لكل شركة بدون إعداد',      color: '#14E0A4', glow: '#14E0A420' },
  { icon: Users,       title: 'إدارة الفريق',     desc: 'أدوار، صلاحيات، هيكل تنظيمي',        color: '#A78BFA', glow: '#A78BFA20' },
  { icon: Briefcase,   title: 'تسليمات ذكية',    desc: 'AI يلخّص الشغل للمستلم تلقائياً',     color: '#FF4757', glow: '#FF475720' },
  { icon: BookOpen,    title: 'قاعدة المعرفة',   desc: 'وثائق الشركة مع بحث ذكي',             color: '#00D4FF', glow: '#00D4FF20' },
];

const STATS = [
  { end: 8,    suffix: '+', label: 'خدمات متكاملة' },
  { end: 14,   suffix: '',  label: 'يوم تجربة مجانية' },
  { end: 85,   suffix: '%', label: 'توفير عن المنافسين' },
  { end: 24,   suffix: '/٧', label: 'مساعد AI متاح' },
];

const HERO_WORDS = ['شركتك', 'فريقك', 'مستقبلك'];

const SHUKRA_STEPS = [
  { emoji: '📸', title: 'صوّر أو اكتب', desc: 'أرسل صورة فاتورة أو نص على تلغرام', color: '#10B981' },
  { emoji: '🤖', title: 'شكرة يقرأ', desc: 'Claude يستخرج المبلغ، العملة، الجهة', color: '#2E8BFF' },
  { emoji: '📊', title: 'يُسجَّل تلقائياً', desc: 'يُضاف للGoogle Sheet الاحترافي فوراً', color: '#8B5CF6' },
];

// ─── animation variants ───────────────────────────────────────────────────────

const up = (delay = 0) => ({
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, delay, ease: 'easeOut' as const } },
});

const stagger = (staggerTime = 0.08) => ({
  hidden: {},
  show: { transition: { staggerChildren: staggerTime } },
});

const cardVariant = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

// ─── hooks ────────────────────────────────────────────────────────────────────

function useTypewriter(words: string[], speed = 100, pause = 2000) {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!deleting && subIndex === words[index].length) {
      const t = setTimeout(() => setDeleting(true), pause);
      return () => clearTimeout(t);
    }
    if (deleting && subIndex === 0) {
      setDeleting(false);
      setIndex((i) => (i + 1) % words.length);
      return;
    }
    const t = setTimeout(() => {
      setText(words[index].substring(0, subIndex + (deleting ? -1 : 1)));
      setSubIndex((s) => s + (deleting ? -1 : 1));
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(t);
  }, [subIndex, deleting, index, words, speed, pause]);

  return text;
}

function useCountUp(end: number, duration = 1800, startOnView = true) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!startOnView) { setStarted(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [startOnView]);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = Math.ceil(end / (duration / 16));
    const t = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(t); }
      else setCount(start);
    }, 16);
    return () => clearInterval(t);
  }, [started, end, duration]);

  return { count, ref };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LandingIntro() {
  return (
    <main className="relative min-h-screen bg-[#06060f] text-white overflow-x-hidden" dir="rtl">
      <style>{`
        @keyframes float-slow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
        @keyframes float-med  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes spin-slow  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse-ring { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:.2;transform:scale(1.15)} }
        @keyframes drift1     { 0%,100%{transform:translate(0,0)} 33%{transform:translate(30px,-20px)} 66%{transform:translate(-15px,25px)} }
        @keyframes drift2     { 0%,100%{transform:translate(0,0)} 33%{transform:translate(-25px,15px)} 66%{transform:translate(20px,-30px)} }
        @keyframes drift3     { 0%,100%{transform:translate(0,0)} 50%{transform:translate(15px,20px)} }
        @keyframes blink      { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes shimmer    { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes border-spin{ from{--angle:0deg} to{--angle:360deg} }
        .float-slow  { animation: float-slow 6s ease-in-out infinite }
        .float-med   { animation: float-med  4.5s ease-in-out infinite }
        .spin-slow   { animation: spin-slow 12s linear infinite }
        .pulse-ring  { animation: pulse-ring 3s ease-in-out infinite }
        .drift1      { animation: drift1 18s ease-in-out infinite }
        .drift2      { animation: drift2 22s ease-in-out infinite }
        .drift3      { animation: drift3 14s ease-in-out infinite }
        .cursor-blink{ animation: blink 1s step-start infinite }
        .shimmer-text{
          background: linear-gradient(90deg,#fff 0%,#00D4FF 30%,#8B5CF6 50%,#00D4FF 70%,#fff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
        .glow-card:hover { box-shadow: 0 0 32px var(--glow); }
        .gradient-border {
          position:relative;
        }
        .gradient-border::before {
          content:'';
          position:absolute;
          inset:-1px;
          border-radius:inherit;
          padding:1px;
          background:linear-gradient(135deg,#2E8BFF44,#00D4FF44,#14E0A444,#8B5CF644);
          -webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);
          -webkit-mask-composite:xor;
          mask-composite:exclude;
          animation: spin-slow 6s linear infinite;
          pointer-events:none;
        }
      `}</style>

      <Nav />
      <Hero />
      <ServicesSection />
      <ShukraSection />
      <AISection />
      <StatsSection />
      <CTASection />
      <footer className="border-t border-white/5 py-8 text-center text-white/25 text-xs">
        © 2026 ALLOUL&Q · منصة الأعمال الذكية
      </footer>
    </main>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <header className={`fixed top-0 inset-x-0 z-50 px-5 lg:px-10 py-4 flex items-center justify-between transition-all duration-300 ${scrolled ? 'backdrop-blur-xl bg-[#06060f]/90 border-b border-white/5 shadow-lg shadow-black/20' : ''}`}>
      <Link href="/" className="flex items-center gap-2.5">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#2E8BFF] to-[#14E0A4] opacity-40 blur-sm" />
          <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-white/15">
            <Image src="/icon.png" alt="ALLOUL&Q" width={32} height={32} />
          </div>
        </div>
        <span className="font-black text-base tracking-tight">
          ALLOUL<span className="text-[#00D4FF]">&Q</span>
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-7 text-sm text-white/55">
        {[['#services','الخدمات'],['#shukra','شكرة'],['#ai','الذكاء'],].map(([href,label])=>(
          <a key={href} href={href} className="hover:text-white transition-colors relative group">
            {label}
            <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-[#00D4FF] group-hover:w-full transition-all duration-300" />
          </a>
        ))}
        <Link href="/pricing" className="hover:text-white transition-colors relative group">
          الأسعار
          <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-[#00D4FF] group-hover:w-full transition-all duration-300" />
        </Link>
      </nav>

      <Link href="/login" className="relative group px-5 py-2 rounded-xl text-sm font-bold overflow-hidden">
        <span className="absolute inset-0 bg-gradient-to-r from-[#2E8BFF]/20 to-[#00D4FF]/20 border border-white/10 rounded-xl group-hover:from-[#2E8BFF]/40 group-hover:to-[#00D4FF]/40 transition-all" />
        <span className="relative">دخول / تسجيل</span>
      </Link>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const word = useTypewriter(HERO_WORDS, 90, 2200);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex flex-col items-center justify-center px-5 pt-28 pb-20 text-center overflow-hidden">

      {/* Animated background orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="drift1 absolute top-[-15%] left-[-10%] w-[650px] h-[650px] rounded-full bg-[#2E8BFF]/12 blur-[130px]" />
        <div className="drift2 absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-[#8B5CF6]/12 blur-[120px]" />
        <div className="drift3 absolute top-[40%] left-[40%] w-[300px] h-[300px] rounded-full bg-[#14E0A4]/8 blur-[90px]" />

        {/* Floating particles */}
        {[
          { size: 3, x: '15%', y: '20%', delay: 0,   dur: 4 },
          { size: 2, x: '80%', y: '15%', delay: 1,   dur: 5 },
          { size: 4, x: '70%', y: '70%', delay: 0.5, dur: 6 },
          { size: 2, x: '25%', y: '75%', delay: 2,   dur: 4.5 },
          { size: 3, x: '90%', y: '45%', delay: 1.5, dur: 5.5 },
          { size: 2, x: '5%',  y: '55%', delay: 0.8, dur: 4 },
          { size: 4, x: '50%', y: '90%', delay: 2.5, dur: 6 },
          { size: 2, x: '40%', y: '10%', delay: 1.2, dur: 5 },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/20"
            style={{
              width: p.size, height: p.size,
              left: p.x, top: p.y,
              animation: `float-slow ${p.dur}s ${p.delay}s ease-in-out infinite`,
              boxShadow: `0 0 ${p.size * 3}px rgba(0,212,255,0.6)`,
            }}
          />
        ))}
      </div>

      <motion.div style={{ y, opacity }} className="relative w-full max-w-5xl mx-auto">

        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 relative overflow-hidden"
          style={{ background: 'rgba(46,139,255,0.08)', border: '1px solid rgba(46,139,255,0.25)' }}
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.15), transparent)' }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
          />
          <Sparkles size={11} className="text-[#00D4FF] relative" />
          <span className="text-[#00D4FF] text-xs font-bold relative">منصة الأعمال الذكية · مدعومة بـ Claude</span>
        </motion.div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.3, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative w-28 h-28 md:w-36 md:h-36 mx-auto mb-10"
        >
          <div className="spin-slow absolute -inset-3 rounded-full opacity-60"
            style={{ background: 'conic-gradient(from 0deg, #2E8BFF, #00D4FF, #14E0A4, #8B5CF6, #2E8BFF)', filter: 'blur(3px)' }} />
          <div className="pulse-ring absolute -inset-1 rounded-full bg-[#2E8BFF]/20" />
          <div className="absolute inset-0 rounded-full bg-[#06060f] overflow-hidden border border-white/10">
            <Image src="/icon.png" alt="ALLOUL&Q" width={144} height={144} className="w-full h-full object-cover" priority />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="font-black leading-[1.0] tracking-tight text-[clamp(3rem,8.5vw,7.5rem)] mb-4"
        >
          الذكاء الذي يدير
          <br />
          <span className="relative inline-block">
            <span className="bg-gradient-to-l from-[#2E8BFF] via-[#00D4FF] to-[#14E0A4] bg-clip-text text-transparent">
              {word}
            </span>
            <span className="cursor-blink text-[#00D4FF]">|</span>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 1.1 }}
          className="text-base md:text-lg text-white/50 max-w-xl mx-auto mb-10"
        >
          مهام، محاسبة، اجتماعات، CRM، ومساعد AI — بسعر أرخص من تطبيق واحد.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.3 }}
          className="flex flex-wrap items-center justify-center gap-3 mb-16"
        >
          <Link href="/login" className="group relative inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm overflow-hidden">
            <span className="absolute inset-0 bg-gradient-to-l from-[#2E8BFF] to-[#00D4FF] rounded-full" />
            <span className="absolute inset-0 bg-gradient-to-l from-[#2E8BFF] to-[#14E0A4] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="absolute inset-0 shadow-lg shadow-[#2E8BFF]/40 group-hover:shadow-[#14E0A4]/50 rounded-full transition-shadow duration-300" />
            <span className="relative text-white">ابدأ التجربة المجانية</span>
            <ArrowUpRight size={16} className="relative text-white group-hover:translate-x-[-2px] group-hover:-translate-y-[2px] transition-transform" />
          </Link>

          <Link href="#services" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 hover:border-white/20 transition-all">
            اكتشف الخدمات
            <ChevronLeft size={16} className="text-white/40" />
          </Link>
        </motion.div>

        {/* Dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 50, rotateX: 15 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1, delay: 1.5, ease: [0.2, 0.8, 0.2, 1] }}
          className="float-slow relative max-w-2xl mx-auto"
        >
          <div className="relative rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Gradient top border */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#2E8BFF]/60 to-transparent" />

            {/* Topbar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF4757]/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFB24D]/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#14E0A4]/80" />
              <div className="flex-1 mx-3 h-5 rounded-md bg-white/5 flex items-center px-2">
                <span className="text-[10px] text-white/20">alloul.app/workspace</span>
              </div>
            </div>

            {/* Mini cards */}
            <div className="p-4 grid grid-cols-4 gap-2">
              {SERVICES.slice(0, 4).map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.8 + i * 0.1 }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-105"
                  style={{ background: s.glow, border: `1px solid ${s.color}22` }}
                >
                  <s.icon size={18} style={{ color: s.color }} />
                  <span className="text-[9px] text-white/55 text-center leading-tight">{s.title}</span>
                </motion.div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-white/30">إنجاز المشاريع</span>
                <span className="text-[10px] text-[#14E0A4] font-bold">٧٢٪</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '72%' }}
                  transition={{ duration: 1.5, delay: 2.2, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-[#2E8BFF] to-[#14E0A4]"
                />
              </div>
            </div>

            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-[#06060f] to-transparent pointer-events-none" />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── Services ─────────────────────────────────────────────────────────────────

function ServicesSection() {
  return (
    <section id="services" className="py-28 px-5 lg:px-10 max-w-7xl mx-auto">
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={up()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-px bg-gradient-to-r from-[#2E8BFF] to-[#00D4FF]" />
          <span className="text-[#00D4FF] text-xs font-bold uppercase tracking-widest">الخدمات</span>
        </div>
        <h2 className="font-black text-[clamp(1.9rem,4.5vw,4rem)] leading-[1.1] mb-3">
          كل ما يحتاجه فريقك
        </h2>
        <p className="text-white/40 text-base mb-14 max-w-md">
          بدل $88/شخص لـ7 تطبيقات — ادفع $7.5 لكل شيء هنا.
        </p>
      </motion.div>

      <motion.div
        initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}
        variants={stagger(0.06)}
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {SERVICES.map((s) => (
          <motion.div
            key={s.title}
            variants={cardVariant}
            className="glow-card group relative p-5 rounded-2xl cursor-default transition-all duration-300 overflow-hidden"
            style={{
              '--glow': s.color + '30',
              background: `linear-gradient(135deg, ${s.color}08, rgba(255,255,255,0.01))`,
              border: `1px solid ${s.color}18`,
            } as React.CSSProperties}
          >
            {/* Hover shimmer */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ background: `radial-gradient(circle at 50% 0%, ${s.color}15, transparent 70%)` }}
            />

            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg relative"
              style={{
                background: `${s.color}15`,
                border: `1px solid ${s.color}30`,
                boxShadow: `0 0 0 ${s.color}00`,
              }}
            >
              {/* Icon glow on hover */}
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ boxShadow: `0 0 20px ${s.color}50`, borderRadius: 12 }} />
              <s.icon size={22} style={{ color: s.color }} className="relative" />
            </div>

            <h3 className="font-bold text-sm mb-1.5 group-hover:text-white transition-colors">{s.title}</h3>
            <p className="text-xs text-white/40 leading-relaxed">{s.desc}</p>

            {/* Bottom line */}
            <div className="absolute bottom-0 left-0 h-px w-0 group-hover:w-full transition-all duration-500"
              style={{ background: `linear-gradient(90deg, ${s.color}60, transparent)` }} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ─── شكرة ─────────────────────────────────────────────────────────────────────

function ShukraSection() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveStep(s => (s + 1) % 3), 2500);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="shukra" className="py-28 px-5 lg:px-10 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#10B981]/6 blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={up()} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/25 text-[#10B981] text-xs font-bold mb-5">
            <Receipt size={12} />
            شكرة — المحاسب الذكي
          </div>
          <h2 className="font-black text-[clamp(1.9rem,4.5vw,4rem)] leading-[1.1] mb-4">
            محاسبتك على تلغرام
            <br />
            <span className="bg-gradient-to-l from-[#10B981] to-[#00D4FF] bg-clip-text text-transparent">
              بدون محاسب بشري
            </span>
          </h2>
        </motion.div>

        {/* Animated steps */}
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger(0.1)}
          className="grid md:grid-cols-3 gap-4 mb-14">
          {SHUKRA_STEPS.map((step, i) => (
            <motion.div
              key={i} variants={cardVariant}
              className="relative p-6 rounded-2xl transition-all duration-500 overflow-hidden"
              style={{
                background: activeStep === i ? `${step.color}12` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${activeStep === i ? step.color + '40' : 'rgba(255,255,255,0.06)'}`,
                transform: activeStep === i ? 'scale(1.03)' : 'scale(1)',
              }}
            >
              {activeStep === i && (
                <div className="absolute top-0 inset-x-0 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${step.color}80, transparent)` }} />
              )}
              <div className="text-3xl mb-4">{step.emoji}</div>
              <div className="absolute top-4 left-4 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
                style={{ background: `${step.color}20`, color: step.color, border: `1px solid ${step.color}40` }}>
                {i + 1}
              </div>
              <h3 className="font-bold text-base mb-1.5" style={{ color: activeStep === i ? step.color : 'white' }}>
                {step.title}
              </h3>
              <p className="text-xs text-white/45 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Live demo */}
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={stagger(0.15)}
          className="grid lg:grid-cols-2 gap-6">

          {/* Telegram mockup */}
          <motion.div variants={cardVariant} className="rounded-2xl overflow-hidden border border-white/6" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5" style={{ background: 'rgba(16,185,129,0.06)' }}>
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center">
                  <Receipt size={16} className="text-[#10B981]" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#10B981] border-2 border-[#06060f]" />
              </div>
              <div>
                <p className="text-sm font-bold">شكرة Bot</p>
                <p className="text-[10px] text-[#10B981]">متصل دائماً</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {[
                { side: 'user', text: 'اشتريت لابتوب Dell بـ 3500 دولار' },
                { side: 'bot', text: '⏳ جاري تسجيل المعاملة...' },
                { side: 'bot', text: null },
              ].map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: msg.side === 'user' ? 20 : -20 }}
                  whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.3 }}
                  className={`flex ${msg.side === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.text === null ? (
                    <div className="rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] text-xs space-y-1"
                      style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <p className="font-bold text-[#10B981]">✅ تم التسجيل في Google Sheet</p>
                      <p className="text-white/65">📉 مصروف · 3,500 USD · Dell · مشتريات</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl px-4 py-2.5 max-w-[80%] text-xs"
                      style={{
                        background: msg.side === 'user' ? 'rgba(46,139,255,0.2)' : 'rgba(255,255,255,0.05)',
                        border: msg.side === 'user' ? '1px solid rgba(46,139,255,0.2)' : '1px solid rgba(255,255,255,0.06)',
                        borderRadius: msg.side === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      }}>
                      {msg.text}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Sheet mockup */}
          <motion.div variants={cardVariant} className="rounded-2xl overflow-hidden border border-white/6" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="px-5 py-4 border-b border-white/5" style={{ background: 'rgba(16,185,129,0.06)' }}>
              <p className="text-sm font-bold text-[#10B981]">📉 سجل المشتريات</p>
              <p className="text-[10px] text-white/35 mt-0.5">يُحدَّث تلقائياً · آخر تحديث الآن</p>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-1 text-[10px] text-white/30 mb-2 px-1">
                {['التاريخ','المبلغ','الجهة','الحالة'].map(h=><span key={h}>{h}</span>)}
              </div>
              {[
                { date:'٢٣ أبريل', amount:'3,500 USD', vendor:'Dell', status:'مدفوع', color:'#10B981', isNew: true },
                { date:'٢٠ أبريل', amount:'20,000 AED', vendor:'مرسيدس', status:'مدفوع', color:'#10B981', isNew: false },
                { date:'١٨ أبريل', amount:'1,200 SAR', vendor:'STC', status:'معلق', color:'#FFB24D', isNew: false },
              ].map((row, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                  className="grid grid-cols-4 gap-1 px-2 py-2.5 rounded-lg text-[11px] mb-1 transition-colors"
                  style={{ background: row.isNew ? `${row.color}10` : 'transparent', border: row.isNew ? `1px solid ${row.color}20` : '1px solid transparent' }}>
                  <span className="text-white/50">{row.date}</span>
                  <span className="text-white font-semibold">{row.amount}</span>
                  <span className="text-white/65">{row.vendor}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold inline-flex items-center w-fit"
                    style={{ color: row.color, background: `${row.color}18` }}>
                    {row.status}
                  </span>
                </motion.div>
              ))}
              <div className="flex justify-between pt-3 mt-2 border-t border-white/5">
                <span className="text-[10px] text-white/30">إجمالي المصروفات</span>
                <span className="text-sm font-black text-white">$24,700</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── AI Section ───────────────────────────────────────────────────────────────

function AISection() {
  return (
    <section id="ai" className="py-28 px-5 lg:px-10 max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-14 items-center">

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={up()}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-px bg-[#8B5CF6]" />
            <span className="text-[#8B5CF6] text-xs font-bold uppercase tracking-widest">المساعد الذكي</span>
          </div>
          <h2 className="font-black text-[clamp(1.9rem,4vw,3.8rem)] leading-[1.1] mb-5">
            ذكاء حقيقي
            <br />
            <span className="bg-gradient-to-l from-[#8B5CF6] to-[#00D4FF] bg-clip-text text-transparent">ليس مجرد دردشة</span>
          </h2>
          <p className="text-white/45 text-base mb-8 leading-relaxed">
            المساعد يعرف شركتك — يقرأ مهامك، يحلّل تسليماتك، ويقترح خطوتك التالية.
          </p>
          <motion.ul initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger(0.1)} className="space-y-3 mb-8">
            {['أولويات اليوم من بين عشرات المهام','تلخيص التسليمات للمستلم الجديد','تحليل الصفقات وخط الأنابيب','ملاحظات الاجتماعات تلقائياً'].map((f,i)=>(
              <motion.li key={i} variants={up(i*0.05)} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)' }}>
                  <Zap size={10} className="text-[#8B5CF6]" />
                </div>
                <span className="text-sm text-white/65">{f}</span>
              </motion.li>
            ))}
          </motion.ul>
          <Link href="/login" className="inline-flex items-center gap-2 text-[#8B5CF6] font-bold text-sm hover:gap-3 transition-all group">
            جرّب المساعد الآن
            <ArrowUpRight size={16} className="group-hover:translate-x-[-2px] group-hover:-translate-y-[2px] transition-transform" />
          </Link>
        </motion.div>

        {/* Chat */}
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={up(0.2)}
          className="float-med">
          <div className="relative rounded-2xl overflow-hidden gradient-border" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(139,92,246,0.15)' }}>
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#8B5CF6]/60 to-transparent" />
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/10 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/30 to-[#2E8BFF]/30" />
                <Image src="/icon.png" alt="AI" width={32} height={32} className="relative" />
              </div>
              <div>
                <p className="text-sm font-bold">ALLOUL AI</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] pulse-ring" />
                  <p className="text-[10px] text-[#8B5CF6]">يفكّر معك</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {[
                { side:'user', text:'ما أولويات اليوم؟' },
                { side:'bot', content: (
                  <div className="space-y-1.5">
                    <p className="font-bold text-[#8B5CF6] text-xs mb-2">أولوياتك:</p>
                    <p className="text-white/65 text-xs">⚡ مراجعة عرض العميل — تأخّر يومين</p>
                    <p className="text-white/65 text-xs">📊 اجتماع التسويق الساعة ١١</p>
                    <p className="text-white/65 text-xs">✅ تسليم مشروع API قبل الجمعة</p>
                  </div>
                )},
                { side:'user', text:'لخّص آخر تسليم' },
                { side:'bot', typing: true },
              ].map((msg, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className={`flex ${msg.side === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {'typing' in msg && msg.typing ? (
                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm text-xs flex items-center gap-2"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {[0,1,2].map(d=>(
                        <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"
                          style={{ animation: `blink 1.2s ${d*0.2}s ease-in-out infinite` }} />
                      ))}
                    </div>
                  ) : 'content' in msg ? (
                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm max-w-[88%]"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {msg.content}
                    </div>
                  ) : (
                    <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[80%] text-xs"
                      style={{ background: 'rgba(46,139,255,0.18)', border: '1px solid rgba(46,139,255,0.2)' }}>
                      {msg.text}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function StatItem({ stat }: { stat: typeof STATS[0] }) {
  const { count, ref } = useCountUp(stat.end, 1600);
  return (
    <motion.div variants={cardVariant} className="text-center group">
      <p ref={ref} className="font-black text-[clamp(2.5rem,5vw,4rem)] leading-none mb-2">
        <span className="shimmer-text">{count}</span>
        <span className="text-[#00D4FF]">{stat.suffix}</span>
      </p>
      <p className="text-xs text-white/35 group-hover:text-white/55 transition-colors">{stat.label}</p>
    </motion.div>
  );
}

function StatsSection() {
  return (
    <section className="py-20 px-5 border-y border-white/5 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(46,139,255,0.04), transparent 70%)' }} />
      </div>
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} variants={stagger(0.1)}
        className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {STATS.map((s, i) => <StatItem key={i} stat={s} />)}
      </motion.div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="py-36 px-5 text-center relative overflow-hidden">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="drift1 absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-[#2E8BFF]/7 blur-[120px]" />
        <div className="drift2 absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#8B5CF6]/7 blur-[100px]" />
      </div>

      <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={up()} className="max-w-3xl mx-auto">
        <h2 className="font-black text-[clamp(2.5rem,6.5vw,6rem)] leading-[1.0] mb-6">
          جاهز لتحويل
          <br />
          <span className="bg-gradient-to-l from-[#2E8BFF] via-[#00D4FF] to-[#14E0A4] bg-clip-text text-transparent">
            طريقة عملك؟
          </span>
        </h2>

        <p className="text-white/45 text-base mb-10">
          ١٤ يوم تجربة مجانية · بدون بطاقة ائتمان · إلغاء في أي وقت
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
          <Link href="/login" className="group relative inline-flex items-center gap-2 px-9 py-4 rounded-full font-bold text-base overflow-hidden">
            <span className="absolute inset-0 bg-gradient-to-l from-[#2E8BFF] to-[#00D4FF] rounded-full" />
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"
              style={{ background: 'linear-gradient(to left, #2E8BFF, #14E0A4)' }} />
            <span className="absolute inset-0 rounded-full transition-shadow duration-300"
              style={{ boxShadow: '0 0 40px rgba(46,139,255,0.35)' }} />
            <span className="relative text-white">ابدأ تجربتك المجانية</span>
            <ArrowUpRight size={18} className="relative text-white" />
          </Link>
          <Link href="/pricing" className="inline-flex items-center gap-2 px-9 py-4 rounded-full border border-white/10 text-white/65 font-bold text-base hover:border-white/20 hover:text-white transition-all">
            عرض الأسعار
          </Link>
        </div>

        {/* Trust row */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-white/20">
          {[
            [MessageSquare, 'دعم عربي كامل'],
            [Phone, 'iOS + Android + Web'],
            [Zap, 'Claude AI'],
            [Sparkles, 'بدون إعداد معقّد'],
          ].map(([Icon, label], i) => (
            <span key={i} className="flex items-center gap-1.5 hover:text-white/40 transition-colors">
              {/* @ts-ignore */}
              <Icon size={12} />
              {label as string}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
