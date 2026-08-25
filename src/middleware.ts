import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const CSP_HEADER = [
  "default-src 'self'",
  process.env.NODE_ENV !== 'production'
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https://cdn.discordapp.com data:",
  "connect-src 'self'",
  "font-src 'self'",
  "frame-ancestors 'none'",
].join('; ');

export async function middleware(request: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  const isSecure =
    request.headers.get('x-forwarded-proto') === 'https' ||
    process.env.NODE_ENV === 'production' ||
    process.env.NEXTAUTH_URL?.startsWith('https://');

  const token = await getToken({
    req: request,
    secret,
    secureCookie: isSecure,
  });

  const adminRoles = ['ADMIN', 'TIPSTER'];
  if (!token || !adminRoles.includes(token.role as string)) {
    const url = request.nextUrl.clone();
    url.pathname = '/404-not-found-trigger';
    const res = NextResponse.rewrite(url);
    res.headers.set('Content-Security-Policy-Report-Only', CSP_HEADER);
    return res;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (forwardedHost) {
    requestHeaders.set('x-forwarded-host', forwardedHost);
  }

  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  requestHeaders.set('x-forwarded-proto', forwardedProto);

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  res.headers.set('Content-Security-Policy-Report-Only', CSP_HEADER);
  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
