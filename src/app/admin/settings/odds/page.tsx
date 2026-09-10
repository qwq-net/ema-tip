import { getDefaultGuaranteedOdds } from '@/entities/race/lib/guaranteed-odds';
import { updateSystemDefaultOdds } from '@/features/admin/manage-settings/actions';
import { GuaranteedOddsForm } from '@/features/admin/shared/ui/guaranteed-odds-form';
import { AdminPage } from '@/features/admin/ui/admin-page';
import { DEFAULT_GUARANTEED_ODDS } from '@/shared/constants/odds';
import { AdminPageHeader } from '@/shared/ui/layout/admin-page-header';

export default async function DefaultOddsSettingsPage() {
  const defaultOdds = await getDefaultGuaranteedOdds();

  return (
    <AdminPage width="medium">
      <AdminPageHeader
        title="デフォルト保証オッズ設定"
        description="レース単位で上書きしていない券種に適用される保証オッズです。"
      />
      <GuaranteedOddsForm
        key={JSON.stringify(defaultOdds)}
        title="保証オッズ設定値"
        description="全ての券種を 1.1 倍以上で入力してください。変更は上書きのない全てのレースに反映されます。"
        initialOdds={defaultOdds}
        placeholders={DEFAULT_GUARANTEED_ODDS}
        action={updateSystemDefaultOdds}
        successMessage="デフォルト保証オッズを更新しました"
      />
    </AdminPage>
  );
}
