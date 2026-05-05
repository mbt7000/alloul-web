'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import ComingSoon from '@/components/ComingSoon';
import { FEATURES } from '@/config/features';

export default function BookmarksPage() {
  const router = useRouter();

  useEffect(() => {
    if (!FEATURES.MEDIA_WORLD) {
      router.replace('/workspace');
    }
  }, [router]);

  if (!FEATURES.MEDIA_WORLD) return null;

  return (
    <ComingSoon
      title="المحفوظات"
      icon={<Bookmark size={40} strokeWidth={2} />}
      description="كل المنشورات والتسليمات التي حفظتها — متاحة في مكان واحد"
      accentColor="#8B5CF6"
    />
  );
}
