'use client';

import { MessageSquare } from 'lucide-react';
import WorkspaceComingSoon from '@/components/WorkspaceComingSoon';

export default function CompanyChatPage() {
  return (
    <WorkspaceComingSoon
      title="دردشة الشركة"
      icon={MessageSquare}
      color="#00D4FF"
      tagline="شات جماعي لفريق الشركة — قنوات، رسائل خاصة، وملفات."
      features={[
        'قنوات عامة لكل فريق (تطوير، تسويق، مبيعات…)',
        'رسائل خاصة بين الموظفين مع تأكيد قراءة',
        'مشاركة ملفات وصور مع معاينة فورية',
        'ردود ذكية من المساعد (AI) داخل الشات',
        'بحث عميق في كل سجل المحادثات',
      ]}
    />
  );
}
