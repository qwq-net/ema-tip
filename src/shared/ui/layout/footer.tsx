import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 bg-white py-4 md:py-6">
      <div className="text-text-sub container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm md:flex-row md:px-6">
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-text-main hover:underline">
            利用規約
          </Link>
          <Link href="/privacy" className="hover:text-text-main hover:underline">
            プライバシーポリシー
          </Link>
        </div>
        <div>
          <p>&copy; {new Date().getFullYear()} えまちっぷ. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
