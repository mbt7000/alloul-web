'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import ComingSoon from '@/components/ComingSoon';
import { FEATURES } from '@/config/features';

export default function MessagesPage() {
  const router = useRouter();

  useEffect(() => {
    if (!FEATURES.MEDIA_WORLD) {
      router.replace('/workspace');
    }
  }, [router]);

  if (!FEATURES.MEDIA_WORLD) return null;

  return (
    <ComingSoon
      title="الرسائل"
      icon={<MessageSquare size={40} strokeWidth={2} />}
      description="دردشة مباشرة مع كل من تتابعهم أو أعضاء فريقك في الشركة"
      accentColor="#14E0A4"
    />
  );
}
