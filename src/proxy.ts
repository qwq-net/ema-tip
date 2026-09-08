import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  // getToken は secret が無いと MissingSecret を投げる。ここで先に止めて原因を明示する
  if (!secret) {
    throw new Error('AUTH_SECRET または NEXTAUTH_SECRET が設定されていません');
  }

  // 受け取った scheme。前段のプロキシが付けていなければ、このリクエスト自身の scheme を使う
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');

  // Cookie 名の判定は next-auth と同じ規則にする。next-auth は AUTH_URL または NEXTAUTH_URL が
  // あればその scheme、無ければリクエストの scheme が https のときだけ __Secure- を付ける。
  // 以前は x-forwarded-proto が https なら __Secure- を探していたため、AUTH_URL が http の dev を
  // Cloudflare Tunnel 経由で開くと next-auth が発行した平文名の Cookie を読めず /admin が 404 になっていた
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  const isSecure = authUrl ? authUrl.startsWith('https://') : forwardedProto === 'https';

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
