'use client';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function Redirect() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const qs = params.toString();
    router.replace(`/workspace/calls${qs ? '?' + qs : ''}`);
  }, [router, params]);
  return null;
}

export default function MeetingsRedirect() {
  return <Suspense><Redirect /></Suspense>;
}
