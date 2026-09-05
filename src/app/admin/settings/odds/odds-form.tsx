'use client';

import { GuaranteedOddsInputs } from '@/features/admin/shared/ui/guaranteed-odds-inputs';
import { Button } from '@/shared/ui';
import { preventEnterSubmit } from '@/shared/utils/form';
import { useState } from 'react';

export function OddsForm({
  initialOdds,
  action,
}: {
  initialOdds?: Record<string, number>;
  action: (formData: FormData) => Promise<void>;
}) {
  const [odds, setOdds] = useState(initialOdds ?? {});

  return (
    <form action={action} onKeyDown={preventEnterSubmit} className="space-y-6">
      <input type="hidden" name="odds" value={JSON.stringify(odds)} />
      <GuaranteedOddsInputs value={odds} onChange={setOdds} />
      <div className="flex justify-end">
        <Button type="submit">設定を保存して戻る</Button>
      </div>
    </form>
  );
}
