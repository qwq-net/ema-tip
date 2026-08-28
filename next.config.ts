import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

// 開発判定は NODE_ENV ではなく phase で行う。
// dev コンテナは NODE_ENV=production のまま next dev を動かしているため、
// NODE_ENV 判定だと開発時に unsafe-eval が落ちて Turbopack が動かない。
const buildSecurityHeaders = (isDev: boolean) => {
  // 開発時は Turbopack の eval と HMR の WebSocket を許可する必要がある
  const cspHeader = [
    "default-src 'self'",
    isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://cdn.discordapp.com data:",
    isDev ? "connect-src 'self' ws:" : "connect-src 'self'",
    "font-src 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  const headers = [
    {
      key: 'Content-Security-Policy',
      value: cspHeader,
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=()',
    },
  ];

  if (!isDev) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    });
  }

  return headers;
};

const nextConfig = (phase: string): NextConfig => {
  const securityHeaders = buildSecurityHeaders(phase === PHASE_DEVELOPMENT_SERVER);

  return {
    turbopack: {
      root: process.cwd(),
    },
    experimental: {
      serverActions: {
        bodySizeLimit: '2mb',
      },
    },
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'cdn.discordapp.com',
          pathname: '/**',
        },
      ],
    },
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: securityHeaders,
        },
      ];
    },
  };
};

export default nextConfig;
