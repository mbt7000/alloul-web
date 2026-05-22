'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Plug2, ArrowLeft, Zap, Shield, RefreshCw } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { isAuthenticated } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const INTEGRATIONS_URL = process.env.NEXT_PUBLIC_INTEGRATIONS_URL || 'http://localhost:3002';

const HIGHLIGHTS = [
  {
    icon: Zap,
    title: 'ربط تلقائي',
    desc: 'وصّل جداول Google Sheets، Slack، Notion وأكثر — في خطوات قليلة',
    color: '#10b981',
  },
  {
    icon: Shield,
    title: 'صلاحيات دقيقة',
    desc: 'تحكم بما يقدر AI يقرأه أو يعدّله في كل خدمة بشكل منفصل',
    color: '#2563eb',
  },
  {
    icon: RefreshCw,
    title: 'مزامنة مستمرة',
    desc: 'البيانات تتدفق بين خدماتك وALLOUL&Q تلقائياً في الوقت الفعلي',
    color: '#8b5cf6',
  },
];

export default function IntegrationsPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) router.replace('/login');
  }, [router]);

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-dark-bg-900/85 backdrop-blur-xl border-b border-primary/10 px-4 py-3 flex items-center gap-4">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <Plug2 size={18} className="text-primary" />
          <h1 className="text-white font-black text-[17px]">الروابط</h1>
        </div>
      </header>

      <div className="px-4 pt-8 pb-24 md:pb-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <div
            className="inline-flex w-20 h-20 rounded-3xl items-center justify-center mb-5 border-2"
            style={{
              background: 'rgba(16,185,129,0.1)',
              borderColor: 'rgba(16,185,129,0.3)',
              boxShadow: '0 0 50px rgba(16,185,129,0.15)',
            }}
          >
            <Plug2 size={38} className="text-emerald-400" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">اربط خدماتك بـ ALLOUL&Q</h2>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
            وصّل أدواتك المفضلة واجعل الـ AI يعمل عبر كل منصاتك تلقائياً
          </p>
        </div>

        {/* Highlights */}
        <div className="space-y-3 mb-10">
          {HIGHLIGHTS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-start gap-4 bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border"
                  style={{
                    background: `${item.color}15`,
                    borderColor: `${item.color}30`,
                  }}
                >
                  <Icon size={18} style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-0.5">{item.title}</p>
                  <p className="text-white/45 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <a
          href={INTEGRATIONS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white font-bold text-base transition-all"
          style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            boxShadow: '0 0 30px rgba(16,185,129,0.3)',
          }}
        >
          <Plug2 size={20} />
          فتح مركز الروابط
        </a>

        <p className="text-center text-white/25 text-xs mt-4">
          يفتح في نافذة جديدة
        </p>
      </div>
    </AppShell>
  );
}
