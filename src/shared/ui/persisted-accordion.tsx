'use client';

import { useIsMounted } from '@/shared/hooks/use-is-mounted';
import * as Accordion from '@radix-ui/react-accordion';
import { useEffect, useState } from 'react';
import { Button } from './button';

import type { ReactNode } from 'react';

interface PersistedAccordionProps {
  /** localStorage の保存キー。マウント中は不変であること。 */
  storageKey: string;
  /** 全アイテムの value 一覧。初期表示と「全て開く」の対象になる。 */
  allIds: string[];
  /** allIds が空のときに accordion の代わりに描画する内容。 */
  emptyState: ReactNode;
  /** Accordion.Item 群。value は allIds の要素と対応させること。 */
  children: ReactNode;
}

/**
 * 開閉状態を localStorage に永続化する複数開閉型アコーディオンのシェル。
 * 「全て開く / 全て閉じる」ボタンと Accordion.Root を描画し、children には
 * Accordion.Item 群を渡す。
 *
 * 初期状態は全開。マウント後に storageKey の保存値があればそれを復元する。
 * 保存値が壊れていれば console.error のみで全開のまま続行する。
 * SSR とハイドレーション不一致を避けるため、マウント前は null を返す。
 */
export function PersistedAccordion({ storageKey, allIds, emptyState, children }: PersistedAccordionProps) {
  const isMounted = useIsMounted();
  const [openItems, setOpenItems] = useState<string[]>(allIds);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTimeout(() => setOpenItems(parsed), 0);
      } catch (e) {
        console.error('Failed to parse saved accordion state', e);
      }
    }
  }, [storageKey]);

  const handleValueChange = (value: string[]) => {
    setOpenItems(value);
    localStorage.setItem(storageKey, JSON.stringify(value));
  };

  if (!isMounted) {
    return null;
  }

  if (allIds.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-start gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-sm font-normal"
          onClick={() => handleValueChange(allIds)}
        >
          全て開く
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-sm font-normal" onClick={() => handleValueChange([])}>
          全て閉じる
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        <Accordion.Root type="multiple" value={openItems} onValueChange={handleValueChange} className="w-full">
          {children}
        </Accordion.Root>
      </div>
    </div>
  );
}
