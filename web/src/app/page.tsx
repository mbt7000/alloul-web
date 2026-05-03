'use client';

import { useEffect } from 'react';
import { isAuthenticated } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/workspace');
    } else {
      window.location.replace('/preview.html');
    }
  }, [router]);

  return null;
}
