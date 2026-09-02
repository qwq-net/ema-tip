import { LogoMark } from '@/shared/ui';
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="flex h-16 items-center px-4 md:px-6">
        <Link href="/mypage" className="flex items-center gap-2">
          <LogoMark size={30} />
          <span className="text-primary text-xl font-semibold tracking-tight">えまちっぷ</span>
        </Link>
      </div>
    </header>
  );
}
