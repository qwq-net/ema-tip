'use client';

import { useIsMounted } from '@/shared/hooks/use-is-mounted';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './button';

import type { ReactNode } from 'react';

interface PersistedAccordionProps {
  /** localStorage の保存キー。マウント中は不変であること。 */
  storageKey: string;
  /** 全アイテムの value 一覧。初期表示と「全て開く」の対象になる。 */
  allIds: string[];
  /** allIds が空のときに枠付きカード内へ描画する内容。メッセージ文字列だけで良い。 */
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
    return (
      <div className="rounded-xl border border-gray-100 bg-white py-12 text-center text-gray-500 shadow-sm">
        {emptyState}
      </div>
    );
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

interface PersistedAccordionItemProps {
  /** PersistedAccordion の allIds の要素と対応させる値。 */
  value: string;
  /** 見出し行の内容。行全体がトリガーになるため、内部のリンク等は stopPropagation すること。 */
  header: ReactNode;
  children: ReactNode;
}

/**
 * PersistedAccordion 直下に並べる開閉項目の標準シェル。
 * 見出し行・開閉シェブロン・開閉アニメーションを備え、children を境界線付きで展開する。
 */
export function PersistedAccordionItem({ value, header, children }: PersistedAccordionItemProps) {
  return (
    <Accordion.Item value={value}>
      <Accordion.Header className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-base font-semibold hover:bg-gray-100">
        <Accordion.Trigger className="group flex w-full items-center justify-between">
          {header}
          <ChevronDown className="h-5 w-5 shrink-0 text-gray-400 transition-transform duration-300 ease-in-out group-data-[state=open]:rotate-180" />
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
        <div className="border-t border-gray-100">{children}</div>
      </Accordion.Content>
    </Accordion.Item>
  );
}
