'use client';

import { UserPlus } from 'lucide-react';
import WorkspaceComingSoon from '@/components/WorkspaceComingSoon';

export default function HiringBoardPage() {
  return (
    <WorkspaceComingSoon
      title="لوحة التوظيف"
      icon={UserPlus}
      color="#14E0A4"
      tagline="إدارة المرشحين ومراحل التوظيف في مكان واحد."
      features={[
        'لوحة كانبان لكل مرحلة توظيف (جديد → مقابلة → عرض → موظَّف)',
        'تخزين السير الذاتية وقراءتها بـ AI',
        'ملخص ذكي لكل مرشح مع نقاط القوة',
        'جدولة مقابلات متكاملة مع التقويم',
        'قوالب عروض عمل جاهزة',
      ]}
    />
  );
}
