'use client';

import { toast } from '@/shared/lib/toast';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { updateOddsFromNetkeiba } from '../actions';

export function UpdateNetkeibaOddsButton({ raceId, className }: { raceId: string; className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleUpdate() {
    startTransition(async () => {
      try {
        const result = await updateOddsFromNetkeiba(raceId);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success('オッズを更新しました');
        router.refresh();
      } catch {
        toast.error('オッズの更新に失敗しました');
      }
    });
  }

  return (
    <Button variant="outline" onClick={handleUpdate} disabled={isPending} className={className}>
      <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', isPending && 'animate-spin')} />
      {isPending ? 'オッズ更新中...' : 'オッズを更新'}
    </Button>
  );
}
