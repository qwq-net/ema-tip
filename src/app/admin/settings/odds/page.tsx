import { updateSystemDefaultOdds } from '@/features/admin/manage-settings/actions';
import { AdminPageHeader, AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { db } from '@/shared/db';
import { Card, CardContent, CardHeader } from '@/shared/ui';
import { formString } from '@/shared/utils/form';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { OddsForm } from './odds-form';

// OddsForm は保証オッズの Record を JSON 文字列にして hidden 入力へ載せる。券種キーと倍率だけを受け付ける
const oddsPayloadSchema = z.record(z.string(), z.number());

export default async function DefaultOddsSettingsPage() {
  const guaranteedOddsMaster = await db.query.guaranteedOddsMaster.findMany();

  const defaultOdds = guaranteedOddsMaster.reduce<Record<string, number>>((acc, item) => {
    acc[item.key] = Number(item.odds);
    return acc;
  }, {});

  async function updateOdds(formData: FormData) {
    'use server';
    const oddsStr = formString(formData, 'odds');
    if (!oddsStr) return;

    const odds = oddsPayloadSchema.safeParse(JSON.parse(oddsStr));
    if (!odds.success) return;

    await updateSystemDefaultOdds(odds.data);
    redirect('/admin');
  }

  return (
    <div className="mx-auto max-w-4xl py-8">
      <div className="mb-8">
        <AdminPageHeader
          title="デフォルト保証オッズ設定"
          description="システム全体のデフォルト保証オッズを設定します。"
        />
      </div>

      <Card>
        <CardHeader>
          <AdminSectionTitle>保証オッズ設定値</AdminSectionTitle>
          <p className="text-sm text-gray-500">
            新規に作成されるレースに適用されるデフォルトの保証オッズを設定します。
            <br />※ 既に作成済みのレースの保証オッズは変更されません。個別に変更してください。
          </p>
        </CardHeader>
        <CardContent>
          <OddsForm initialOdds={defaultOdds} action={updateOdds} />
        </CardContent>
      </Card>
    </div>
  );
}
