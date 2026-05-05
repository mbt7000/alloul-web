'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import ComingSoon from '@/components/ComingSoon';
import { FEATURES } from '@/config/features';

export default function ExplorePage() {
  const router = useRouter();

  useEffect(() => {
    if (!FEATURES.MEDIA_WORLD) {
      router.replace('/workspace');
    }
  }, [router]);

  if (!FEATURES.MEDIA_WORLD) return null;

  return (
    <ComingSoon
      title="استكشاف"
      icon={<Search size={40} strokeWidth={2} />}
      description="اكتشف مجتمعات، هاشتاقات، ومحتوى جديد من كل منصة ALLOUL&Q"
      accentColor="#00D4FF"
    />
  );
}
