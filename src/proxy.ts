import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  // getToken は secret が無いと MissingSecret を投げる。ここで先に止めて原因を明示する
  if (!secret) {
    throw new Error('AUTH_SECRET または NEXTAUTH_SECRET が設定されていません');
  }

  const isSecure =
    request.headers.get('x-forwarded-proto') === 'https' ||
    process.env.NODE_ENV === 'production' ||
    (process.env.NEXTAUTH_URL ?? '').startsWith('https://');

  const token = await getToken({
    req: request,
    secret,
    secureCookie: isSecure,
  });

  const adminRoles = ['ADMIN', 'TIPSTER'];
  if (!token || !adminRoles.includes(token.role)) {
    const url = request.nextUrl.clone();
    url.pathname = '/404-not-found-trigger';
    return NextResponse.rewrite(url);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (forwardedHost) {
    requestHeaders.set('x-forwarded-host', forwardedHost);
  }

  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  requestHeaders.set('x-forwarded-proto', forwardedProto);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/admin/:path*'],
};
