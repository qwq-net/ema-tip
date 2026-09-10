'use client';

import { Button } from '@/shared/ui';
import { Trophy } from 'lucide-react';
import Link from 'next/link';

interface RankingButtonProps {
  eventId: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export function RankingButton({ eventId, className, variant = 'outline', size = 'sm' }: RankingButtonProps) {
  if (!eventId) return null;

  return (
    <Button variant={variant} size={size} className={className} asChild>
      <Link href={`/ranking/${eventId}`} scroll={false}>
        <Trophy />
        ランキング
      </Link>
    </Button>
  );
}
