'use client';

import { GuaranteedOddsList } from '@/features/betting/ui/guaranteed-odds-list';
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/shared/ui';
import { ShieldCheck } from 'lucide-react';

interface GuaranteedOddsDialogProps {
  guaranteedOdds?: Record<string, number> | null;
}

// 投票画面用の保証オッズ表示ボタン。押すとモーダルで券種別の保証倍率一覧を表示する。
// 保証倍率が1件も設定されていないレースでは何も描画しない。
// fixedOddsMode のレースでは保証が適用されないため、呼び出し側で描画しない前提
export function GuaranteedOddsDialog({ guaranteedOdds }: GuaranteedOddsDialogProps) {
  if (!guaranteedOdds || Object.keys(guaranteedOdds).length === 0) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 whitespace-nowrap">
          <ShieldCheck className="text-turf-600 h-4 w-4" />
          保証オッズ
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <ShieldCheck className="text-turf-600 h-5 w-5" />
          保証オッズ
        </DialogTitle>
        <DialogDescription>
          的中時の払戻倍率は、投票の集まり具合にかかわらず券種ごとの保証倍率を下回りません。
        </DialogDescription>
        <GuaranteedOddsList guaranteedOdds={guaranteedOdds} />
      </DialogContent>
    </Dialog>
  );
}
