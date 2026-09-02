import { ClientLayoutWrapper } from '@/shared/ui/layout/client-layout-wrapper';
import type { Metadata } from 'next';
import NextTopLoader from 'nextjs-toploader';
import { Toaster } from 'sonner';
import './styles/globals.css';

import { siteConfig } from '@/shared/config/site';

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <NextTopLoader
          color="var(--color-primary)"
          showSpinner={false}
          shadow="0 0 10px var(--color-primary),0 0 5px var(--color-primary)"
        />
        <ClientLayoutWrapper>
          {children}
          {modal}
        </ClientLayoutWrapper>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
