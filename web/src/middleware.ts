import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth is handled client-side in each page component.
// This middleware is kept as a passthrough placeholder.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
