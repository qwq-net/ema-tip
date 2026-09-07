'use client';

import { usePathname } from 'next/navigation';

import { Footer } from './footer';
import { Header } from './header';
import { SkipLink } from './skip-link';

/**
 * 全ページ共通の外殻。利用者側は Header と Footer と main を描き、
 * 管理側は admin/layout が自前の main を持つため div だけを描いてランドマークの二重化を避ける。
 */
export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showLayout = !pathname.startsWith('/admin');
  const Body = showLayout ? 'main' : 'div';

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      {showLayout && <Header />}
      <Body id={showLayout ? 'main' : undefined} className="flex flex-1 flex-col">
        {children}
      </Body>
      {showLayout && <Footer />}
    </div>
  );
}
