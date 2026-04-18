'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  X,
  ChevronDown,
  Moon,
  Sun,
  Building2,
  Users,
  Shield,
  Zap,
  Star,
  Loader2,
} from 'lucide-react';
import { getToken, isAuthenticated } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.alloul.app';

export default function PricingPage() {
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const handleSubscribe = async (planId: string) => {
    if (!isAuthenticated()) {
      router.push('/login?redirect=/pricing');
      return;
    }
    setLoadingPlan(planId);
    try {
      const token = getToken();
      // Ensure company exists
      const companyRes = await fetch(`${API_BASE}/companies/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!companyRes.ok || !(await companyRes.json())) {
        // Create company first
        await fetch(`${API_BASE}/companies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: 'شركتي', company_type: 'startup', size: '1-10' }),
        });
      }
      const res = await fetch(`${API_BASE}/companies/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_id: planId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'حدث خطأ');
      }
      const data = await res.json() as { checkout_url: string };
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch (e: unknown) {
      const err = e as { message?: string };
      alert(err?.message || 'حدث خطأ، أعد المحاولة');
    } finally {
      setLoadingPlan(null);
    }
  };

  // ALLOUL&Q — real prices from Stripe Dashboard (via Cowork setup)
  // starter  → prod_UB8zDoyn2YPFFY ($24/mo)
  // pro      → prod_UB90ckEsKlawsj ($59/mo)
  // pro_plus → prod_UB91gU3Z32gHKq ($289/mo)
  const prices = {
    starter:      { monthly: 24,  yearly: 240,  employees: 5 },
    professional: { monthly: 59,  yearly: 590,  employees: 21 },
    business:     { monthly: 289, yearly: 2890, employees: 33 },
  };

  const monthlyPrice = isYearly ? 'سنوي' : 'شهري';
  const savingsPercent = 17;

  const features = {
    starter: [
      'حتى 5 موظفين',
      'Media World كامل',
      'Corporate World أساسي',
      '10GB تخزين',
      'AI Assistant محدود (50 رسالة/شهر)',
      'دعم إيميل',
      'iOS + Android',
    ],
    professional: [
      'كل ميزات Starter',
      'حتى 21 موظف',
      'Corporate World كامل',
      '50GB تخزين',
      'AI Assistant (500 رسالة/شهر)',
      'مكالمات فيديو عبر Daily.co',
      'دعم أولوية',
      'تحليلات أساسية',
    ],
    business: [
      'كل ميزات Professional',
      'حتى 33 موظف',
      'AI Assistant غير محدود',
      '200GB تخزين',
      'SSO + 2FA',
      'API Access',
      'تحليلات متقدمة',
      'دعم VIP 24/7',
      'Audit Logs',
    ],
  };

  const enterpriseFeatures = [
    { icon: Building2, label: 'Dedicated Infrastructure' },
    { icon: Shield, label: 'Custom Domain' },
    { icon: Zap, label: 'White-label' },
    { icon: Users, label: 'SLA 99.9%' },
    { icon: Users, label: 'Account Manager مخصص' },
    { icon: Shield, label: '24/7 Support' },
  ];

  const faqItems = [
    {
      q: 'ما الفرق بين الخطط المختلفة؟',
      a: 'كل خطة مصممة لاحتياجات مختلفة. Starter للشركات الصغيرة، Professional للشركات المتنامية، Business للشركات الكبيرة، و Enterprise للمؤسسات.',
    },
    {
      q: 'هل تتضمن الخطط فترة تجربة مجانية؟',
      a: 'نعم! جميع الخطط تتضمن 14 يوم تجربة مجانية بدون الحاجة لإدخال بيانات بطاقة ائتمان.',
    },
    {
      q: 'هل يمكنني الترقية أو الترجيع بين الخطط؟',
      a: 'بالتأكيد! يمكنك الترقية أو الترجيع في أي وقت. سيتم حساب الفرق في الفاتورة التالية.',
    },
    {
      q: 'ما سياسة الإلغاء والاسترجاع؟',
      a: 'لا توجد تعاقدات طويلة الأجل. يمكنك إلغاء الاشتراك في أي وقت بدون رسوم إنهاء.',
    },
    {
      q: 'ماذا يشمل Enterprise؟',
      a: 'Enterprise يشمل كل شيء في Business بالإضافة إلى البنية التحتية المخصصة والدعم 24/7 وضمان الخدمة 99.9%.',
    },
    {
      q: 'هل تفرضون ضريبة القيمة المضافة؟',
      a: 'الأسعار المعروضة لا تشمل ضريبة القيمة المضافة. سيتم إضافة الضريبة حسب موقعك الجغرافي.',
    },
    {
      q: 'هل بيانات شركتي آمنة؟',
      a: 'نعم، نستخدم أفضل معايير التشفير والأمان. جميع البيانات محمية بـ SSL وتخزينها على خوادم آمنة.',
    },
    {
      q: 'ما خيارات الدعم المتاحة؟',
      a: 'كل خطة تتضمن الدعم حسب مستوى الخطة. Professional يتضمن دعم 24 ساعة و Business يتضمن دعم مخصص.',
    },
    {
      q: 'ما طرق الدفع المقبولة؟',
      a: 'نقبل بطاقات الائتمان الرئيسية والتحويل البنكي وخدمات الدفع الرقمية الأخرى.',
    },
    {
      q: 'هل هناك خصم للدفع السنوي؟',
      a: 'نعم! الدفع السنوي يوفر 17% مقارنة بالدفع الشهري.',
    },
  ];

  const testimonials = [
    {
      name: 'أحمد محمد',
      company: 'تقنيات الرقمية',
      role: 'المدير التنفيذي',
      text: 'ALLOUL&Q غيرت طريقة عملنا تماماً. الأداة سهلة الاستخدام وفعالة جداً.',
    },
    {
      name: 'فاطمة علي',
      company: 'حلول الأعمال',
      role: 'مدير المشاريع',
      text: 'استطعنا زيادة إنتاجيتنا بنسبة 40% بعد استخدام ALLOUL&Q. موصى به بشدة!',
    },
    {
      name: 'محمود حسن',
      company: 'الاستثمارات الذكية',
      role: 'الرئيس التنفيذي',
      text: 'دعم العملاء رائع والميزات تتطور باستمرار. استثمار رائع لشركتنا.',
    },
  ];

  const comparisonData = [
    { label: 'عدد الموظفين', starter: '5', professional: '15', business: '32', enterprise: 'غير محدود' },
    { label: 'التخزين', starter: '10GB', professional: '50GB', business: '200GB', enterprise: 'غير محدود' },
    { label: 'AI Messages', starter: '50/شهر', professional: '500/شهر', business: 'غير محدود', enterprise: 'غير محدود' },
    { label: 'Media World', starter: true, professional: true, business: true, enterprise: true },
    { label: 'Corporate World', starter: 'أساسي', professional: 'كامل', business: 'كامل', enterprise: 'كامل' },
    { label: 'CRM', starter: false, professional: true, business: true, enterprise: true },
    { label: 'Video Meetings', starter: false, professional: true, business: true, enterprise: true },
    { label: 'API Access', starter: false, professional: false, business: true, enterprise: true },
    { label: 'SSO/2FA', starter: false, professional: false, business: true, enterprise: true },
    { label: 'Audit Logs', starter: false, professional: false, business: true, enterprise: true },
    { label: 'تحليلات', starter: false, professional: 'أساسية', business: 'متقدمة', enterprise: 'متقدمة' },
    { label: 'مستوى الدعم', starter: 'إيميل', professional: '24 ساعة', business: 'مخصص', enterprise: '24/7 مخصص' },
    { label: 'Custom Domain', starter: false, professional: false, business: false, enterprise: true },
    { label: 'SLA', starter: 'بدون', professional: 'بدون', business: 'بدون', enterprise: '99.9%' },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`} dir="rtl">
      {/* Navigation Bar */}
      <nav className={`sticky top-0 z-50 border-b backdrop-blur-md transition-colors duration-300 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className={`text-2xl font-bold bg-gradient-to-l from-blue-400 to-cyan-400 bg-clip-text text-transparent`}>
            ALLOUL&Q
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="/" className={`transition-colors hover:text-blue-400 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              الرئيسية
            </a>
            <a href="/features" className={`transition-colors hover:text-blue-400 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              المميزات
            </a>
            <a href="/pricing" className="text-blue-400 font-semibold">
              الأسعار
            </a>
            <a href="/contact" className={`transition-colors hover:text-blue-400 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              تواصل معنا
            </a>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-200 hover:bg-slate-300'}`}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="hidden sm:block px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-sm">
              AR
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`py-16 md:py-24 px-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="max-w-4xl mx-auto text-center">
          <div className={`inline-block px-4 py-2 rounded-full mb-6 ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
            أكثر من 500+ شركة تثق بنا
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-l from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            اختر الخطة المناسبة لشركتك
          </h1>

          <p className={`text-lg md:text-xl mb-8 max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            ALLOUL&Q - منصة الأعمال الذكية. أدر فريقك، مشاريعك، وعملائك من مكان واحد
          </p>
        </div>
      </section>

      {/* Billing Toggle */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto flex justify-center items-center gap-4">
          <span className={isYearly ? (isDark ? 'text-gray-400' : 'text-slate-600') : 'font-semibold'}>
            شهري
          </span>

          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${
              isYearly ? 'bg-blue-600' : (isDark ? 'bg-slate-700' : 'bg-slate-300')
            }`}
          >
            <span
              className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${
                isYearly ? 'translate-x-1' : '-translate-x-1'
              }`}
            />
          </button>

          <span className={!isYearly ? (isDark ? 'text-gray-400' : 'text-slate-600') : 'font-semibold'}>
            سنوي
          </span>

          {isYearly && (
            <div className={`ml-4 px-3 py-1 rounded-full text-sm font-semibold ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
              وفّر {savingsPercent}%
            </div>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter Card */}
            <div className={`rounded-2xl p-8 transition-all duration-300 hover:scale-105 ${isDark ? 'bg-slate-800 border border-slate-700 hover:border-blue-500' : 'bg-slate-100 border border-slate-300 hover:border-blue-500'}`}>
              <div className={`inline-block px-3 py-1 rounded-full text-sm mb-6 ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                14 يوم تجربة مجانية
              </div>

              <h3 className="text-2xl font-bold mb-2">ALLOUL&Q Starter</h3>

              <div className="mb-6">
                <div className="text-4xl font-bold">
                  ${isYearly ? prices.starter.yearly : prices.starter.monthly}
                </div>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                  {isYearly ? 'سنوياً' : 'شهرياً'}
                </p>
                {isYearly && (
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                    أو <span className="line-through">$360</span> شهرياً
                  </p>
                )}
              </div>

              <button
                onClick={() => handleSubscribe('starter')}
                disabled={!!loadingPlan}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors mb-8 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loadingPlan === 'starter' ? <Loader2 size={18} className="animate-spin" /> : null}
                ابدأ التجربة المجانية
              </button>

              <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                بدون بطاقة ائتمان
              </p>

              <div className="space-y-4">
                {features.starter.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check size={20} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Professional Card (Most Popular) */}
            <div className={`rounded-2xl p-8 ring-2 ring-blue-500 shadow-2xl shadow-blue-500/20 scale-105 transition-all duration-300 hover:scale-110 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-slate-100 border border-slate-300'}`}>
              <div className={`inline-block px-3 py-1 rounded-full text-sm mb-6 font-semibold ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                ⭐ الأكثر شعبية
              </div>

              <h3 className="text-2xl font-bold mb-2">ALLOUL&Q Professional</h3>

              <div className="mb-6">
                <div className="text-4xl font-bold">
                  ${isYearly ? prices.professional.yearly : prices.professional.monthly}
                </div>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                  {isYearly ? 'سنوياً' : 'شهرياً'}
                </p>
                {isYearly && (
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                    أو <span className="line-through">$1080</span> شهرياً
                  </p>
                )}
              </div>

              <button
                onClick={() => handleSubscribe('pro')}
                disabled={!!loadingPlan}
                className="w-full bg-gradient-to-l from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 rounded-lg transition-colors mb-8 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loadingPlan === 'pro' ? <Loader2 size={18} className="animate-spin" /> : null}
                اشترك الآن
              </button>

              <div className="space-y-4">
                {features.professional.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check size={20} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Business Card */}
            <div className={`rounded-2xl p-8 transition-all duration-300 hover:scale-105 ${isDark ? 'bg-slate-800 border border-slate-700 hover:border-blue-500' : 'bg-slate-100 border border-slate-300 hover:border-blue-500'}`}>
              <div className={`inline-block px-3 py-1 rounded-full text-sm mb-6 ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                للشركات الكبيرة
              </div>

              <h3 className="text-2xl font-bold mb-2">ALLOUL&Q Business</h3>

              <div className="mb-6">
                <div className="text-4xl font-bold">
                  ${isYearly ? prices.business.yearly : prices.business.monthly}
                </div>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                  {isYearly ? 'سنوياً' : 'شهرياً'}
                </p>
                {isYearly && (
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                    أو <span className="line-through">$2520</span> شهرياً
                  </p>
                )}
              </div>

              <button
                onClick={() => handleSubscribe('pro_plus')}
                disabled={!!loadingPlan}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors mb-8 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loadingPlan === 'pro_plus' ? <Loader2 size={18} className="animate-spin" /> : null}
                اشترك الآن
              </button>

              <div className="space-y-4">
                {features.business.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check size={20} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Section */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className={`rounded-2xl p-12 bg-gradient-to-br ${isDark ? 'from-slate-800 to-slate-900' : 'from-slate-100 to-slate-200'} border-2 ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
            <div className="flex items-center gap-4 mb-8">
              <Building2 size={40} className="text-blue-400" />
              <div>
                <h3 className="text-3xl font-bold">ALLOUL&Q Enterprise</h3>
                <p className={`text-lg mt-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                  للشركات أكثر من 32 موظف - حلول مخصصة لمؤسستك
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {enterpriseFeatures.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <Icon size={24} className="text-blue-400 flex-shrink-0" />
                    <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>{feature.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
                تواصل مع خدمة العملاء
              </button>
              <button className={`px-8 py-3 border-2 ${isDark ? 'border-blue-500 text-blue-400 hover:bg-blue-500/10' : 'border-blue-600 text-blue-600 hover:bg-blue-100'} font-semibold rounded-lg transition-colors`}>
                احجز Demo مجاني
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">
            مقارنة شاملة للخطط
          </h2>

          <div className={`rounded-lg overflow-hidden border ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
            <div className={`overflow-x-auto ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <table className="w-full">
                <thead className={`${isDark ? 'bg-slate-900' : 'bg-slate-200'} sticky top-0`}>
                  <tr>
                    <th className={`px-6 py-4 text-right font-semibold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                      الميزة
                    </th>
                    <th className={`px-6 py-4 text-center font-semibold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                      Starter
                    </th>
                    <th className={`px-6 py-4 text-center font-semibold text-blue-400`}>
                      Professional
                    </th>
                    <th className={`px-6 py-4 text-center font-semibold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                      Business
                    </th>
                    <th className={`px-6 py-4 text-center font-semibold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, idx) => (
                    <tr key={idx} className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-300'} ${idx % 2 === 0 ? (isDark ? 'bg-slate-800/50' : 'bg-slate-50') : ''}`}>
                      <td className={`px-6 py-4 font-semibold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                        {row.label}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {typeof row.starter === 'boolean' ? (
                          row.starter ? (
                            <Check size={20} className="text-green-400 mx-auto" />
                          ) : (
                            <X size={20} className={`mx-auto ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                          )
                        ) : (
                          <span className={isDark ? 'text-gray-300' : 'text-slate-700'}>{row.starter}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {typeof row.professional === 'boolean' ? (
                          row.professional ? (
                            <Check size={20} className="text-green-400 mx-auto" />
                          ) : (
                            <X size={20} className={`mx-auto ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                          )
                        ) : (
                          <span className={isDark ? 'text-gray-300' : 'text-slate-700'}>{row.professional}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {typeof row.business === 'boolean' ? (
                          row.business ? (
                            <Check size={20} className="text-green-400 mx-auto" />
                          ) : (
                            <X size={20} className={`mx-auto ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                          )
                        ) : (
                          <span className={isDark ? 'text-gray-300' : 'text-slate-700'}>{row.business}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {typeof row.enterprise === 'boolean' ? (
                          row.enterprise ? (
                            <Check size={20} className="text-green-400 mx-auto" />
                          ) : (
                            <X size={20} className={`mx-auto ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                          )
                        ) : (
                          <span className={isDark ? 'text-gray-300' : 'text-slate-700'}>{row.enterprise}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className={`py-16 px-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">
            الأسئلة الشائعة
          </h2>

          <div className="space-y-4">
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-lg border transition-all duration-300 ${
                  openFAQ === idx
                    ? isDark ? 'bg-slate-800 border-blue-500' : 'bg-slate-50 border-blue-500'
                    : isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <button
                  onClick={() => toggleFAQ(idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-right"
                >
                  <span className="font-semibold text-lg">{item.q}</span>
                  <ChevronDown
                    size={24}
                    className={`transition-transform duration-300 ${openFAQ === idx ? 'rotate-180' : ''} ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                  />
                </button>

                {openFAQ === idx && (
                  <div className={`px-6 pb-4 ${isDark ? 'text-gray-300 border-t border-slate-700' : 'text-slate-700 border-t border-slate-300'}`}>
                    <p className="pt-4">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className={`py-16 px-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">
            ماذا يقول عملاؤنا
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <div
                key={idx}
                className={`rounded-lg p-8 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={18} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                  "{testimonial.text}"
                </p>

                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                    {testimonial.role} • {testimonial.company}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className={`py-16 px-4 ${isDark ? 'bg-gradient-to-b from-slate-800 to-slate-900' : 'bg-gradient-to-b from-slate-100 to-slate-50'}`}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            ابدأ رحلتك مع ALLOUL&Q اليوم
          </h2>

          <p className={`text-lg mb-8 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            14 يوم تجربة مجانية • بدون بطاقة ائتمان
          </p>

          <button className="px-8 py-4 bg-gradient-to-l from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold text-lg rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/50">
            ابدأ الآن
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} py-12 px-4`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className={`text-xl font-bold bg-gradient-to-l from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4`}>
                ALLOUL&Q
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                منصة الأعمال الذكية
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">الشركة</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/about" className={`text-sm transition-colors hover:text-blue-400 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                    عن الشركة
                  </a>
                </li>
                <li>
                  <a href="/blog" className={`text-sm transition-colors hover:text-blue-400 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                    المدونة
                  </a>
                </li>
                <li>
                  <a href="/careers" className={`text-sm transition-colors hover:text-blue-400 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                    الوظائف
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">القانونية</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/privacy" className={`text-sm transition-colors hover:text-blue-400 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                    سياسة الخصوصية
                  </a>
                </li>
                <li>
                  <a href="/terms" className={`text-sm transition-colors hover:text-blue-400 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                    الشروط والأحكام
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">التواصل</h4>
              <ul className="space-y-2">
                <li>
                  <a href="mailto:support@alloul.com" className={`text-sm transition-colors hover:text-blue-400 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                    support@alloul.com
                  </a>
                </li>
                <li>
                  <a href="tel:+966XXXXXXXXX" className={`text-sm transition-colors hover:text-blue-400 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                    +966 (0) 12 XXX XXXX
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} pt-8 flex flex-col md:flex-row items-center justify-between`}>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              © 2026 ALLOUL&Q. جميع الحقوق محفوظة
            </p>

            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className={`transition-colors hover:text-blue-400 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                Twitter
              </a>
              <a href="#" className={`transition-colors hover:text-blue-400 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                LinkedIn
              </a>
              <a href="#" className={`transition-colors hover:text-blue-400 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                Instagram
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
