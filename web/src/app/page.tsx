'use client';

import { useEffect, useState } from 'react';
import LandingIntro from '@/components/LandingIntro';
import { isAuthenticated } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    // Client-side auth check — if authenticated, redirect to workspace
    const ok = isAuthenticated();
    setAuthed(ok);
    if (ok) {
      router.replace('/workspace');
    }
  }, [router]);

  // ─── Loading gate ─────────────────────────────────────────────────────
  if (authed === null) {
    return null; // Redirecting...
  }

  // ─── Not authenticated → show marketing landing ───────────────────────
  if (!authed) {
    return <LandingIntro />;
  }

  // ─── Authenticated → will redirect to workspace ────────────────────────
  return null;
}
