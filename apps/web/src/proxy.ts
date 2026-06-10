import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const slug = hostname.split('.')[0];

  const tenantSlug = process.env.NODE_ENV === 'development' ? 'default' : slug;

  const response = NextResponse.next();
  response.headers.set('x-tenant-slug', tenantSlug);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
