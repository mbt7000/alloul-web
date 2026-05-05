'use client';
import { Bell } from 'lucide-react';
import ComingSoon from '@/components/ComingSoon';

export default function NotificationsPage() {
  return (
    <ComingSoon
      title="الإشعارات"
      icon={<Bell size={40} strokeWidth={2} />}
      description="تنبيهات لحظية لكل المهام، الرسائل، الإعجابات، والتحديثات"
      accentColor="#F59E0B"
    />
  );
}
