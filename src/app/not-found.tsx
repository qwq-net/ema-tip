import { Button } from '@/shared/ui/button';
import { SearchX } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="bg-primary/10 flex h-20 w-20 items-center justify-center rounded-full">
          <SearchX className="text-primary h-10 w-10" />
        </div>
        <div className="space-y-2">
          <p className="text-6xl font-semibold tracking-tight text-gray-300" aria-hidden="true">
            404
          </p>
          <h1 className="text-text-main text-2xl font-semibold">ページが見つかりません</h1>
          <p className="text-text-sub text-sm">お探しのページは存在しないか、移動した可能性があります。</p>
        </div>
        <Button asChild variant="primary">
          <Link href="/mypage">マイページに戻る</Link>
        </Button>
      </div>
    </div>
  );
}
