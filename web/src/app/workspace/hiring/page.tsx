'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HiringRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/workspace/recruitment'); }, [router]);
  return null;
}
