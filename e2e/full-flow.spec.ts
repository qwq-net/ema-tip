import { expect, test, type Page } from '@playwright/test';
import { cleanupFixtures, E2E, fetchSettlementState, setupFixtures, type Fixtures } from './support/fixtures';

/**
 * お金の一本道を通しで検証する唯一のE2E。
 * ゲスト登録 → イベント参加 → 単勝購入 → 管理者が締切・着順確定・払戻確定 → 的中表示と残高。
 * 金額の検証は UI 文言ではなく DB 直接照会で行い、保証オッズ2.0固定で払戻を決定的にしている。
 */

let fx: Fixtures;

test.beforeAll(async () => {
  fx = await setupFixtures();
});

test.afterAll(async () => {
  await cleanupFixtures();
});

// 絵文字キーパッドでパスワードを入力する。E2E.password と同じ内容を打つ
async function typeEmojiPassword(page: Page) {
  for (const emoji of [...E2E.password]) {
    await page.getByRole('button', { name: `${emoji} を入力` }).click();
  }
}

test('ゲスト登録から払戻確定までの一本道', async ({ browser }) => {
  const userContext = await browser.newContext();
  const userPage = await userContext.newPage();

  await test.step('ゲストコードで新規登録', async () => {
    await userPage.goto('/signup/guest');
    await userPage.locator('#code').fill(E2E.guestCode);
    await userPage.locator('#username').fill(E2E.guestName);
    await typeEmojiPassword(userPage);
    await userPage.getByRole('button', { name: '登録して参加' }).click();
    await userPage.waitForURL('**/mypage', { timeout: 30_000 });
  });

  await test.step('イベントに参加して軍資金を受け取る', async () => {
    await userPage.goto('/mypage/claim');
    const card = userPage
      .locator('div')
      .filter({ has: userPage.getByRole('heading', { name: E2E.eventName }) })
      .filter({ has: userPage.getByRole('button', { name: '参加する' }) })
      .last();
    await card.getByRole('button', { name: '参加する' }).click();
    await expect(card.getByRole('button', { name: '参加済み' })).toBeVisible();
  });

  await test.step('馬番1の単勝を100円購入', async () => {
    await userPage.goto(`/races/${fx.raceId}`);
    await userPage.getByRole('checkbox', { name: `1着候補 に${fx.horse1Name}(1番)を選択` }).check();
    await userPage.getByRole('button', { name: '購入確定' }).click();
    await userPage.getByRole('button', { name: '購入する' }).click();
    await expect(userPage.getByText('円分の馬券を購入しました')).toBeVisible();
  });

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();

  await test.step('管理者でログイン', async () => {
    await adminPage.goto('/login/guest');
    await adminPage.locator('#username').fill(E2E.adminName);
    await typeEmojiPassword(adminPage);
    await adminPage.getByRole('button', { name: 'ログイン', exact: true }).click();
    await adminPage.waitForURL('**/mypage', { timeout: 30_000 });
  });

  await test.step('融資は発生条件を満たすまで表示されない', async () => {
    await userPage.goto(`/races/${fx.raceId}`);
    await expect(userPage.getByText('資金が少し不足していませんか？')).toBeHidden();
  });

  await test.step('管理者が発生条件を100%へ変更すると案内が出る', async () => {
    await adminPage.goto(`/admin/events/${fx.eventId}`);
    await adminPage.getByLabel('融資の発生条件').fill('100');
    await adminPage.getByRole('button', { name: 'イベント更新' }).click();
    await expect(adminPage.getByText('イベント情報を更新しました').last()).toBeVisible();

    await userPage.reload();
    await expect(userPage.getByText('資金が少し不足していませんか？')).toBeVisible();
  });

  await test.step('借入機能をOFFにすると案内が消える', async () => {
    await adminPage.getByLabel('借入機能を有効にする').uncheck();
    await adminPage.getByRole('button', { name: 'イベント更新' }).click();
    await expect(adminPage.getByText('イベント情報を更新しました').last()).toBeVisible();

    await userPage.reload();
    await expect(userPage.getByText('資金が少し不足していませんか？')).toBeHidden();
  });

  await test.step('ONへ戻すと借用証モーダルから借入できる', async () => {
    await adminPage.getByLabel('借入機能を有効にする').check();
    await adminPage.getByRole('button', { name: 'イベント更新' }).click();
    await expect(adminPage.getByText('イベント情報を更新しました').last()).toBeVisible();

    await userPage.reload();
    await userPage.getByText('資金が少し不足していませんか？').click();
    await expect(userPage.getByText('借用証')).toBeVisible();
    await userPage.getByRole('button', { name: '10,000円で最終直線へ' }).click();
    await expect(userPage.getByText('10,000円を借り入れました')).toBeVisible();
    await expect(userPage.getByText('資金が少し不足していませんか？')).toBeHidden();

    // 借入後残高 = 配布 - 購入 + 融資(配布と同額)
    const state = await fetchSettlementState(fx.eventId);
    expect(state.balance).toBe(E2E.distributeAmount - E2E.betAmount + E2E.distributeAmount);
  });

  await test.step('締切と着順確定と払戻確定', async () => {
    await adminPage.goto(`/admin/races/${fx.raceId}`);
    await adminPage.getByRole('button', { name: '手動で受付を終了する' }).click();

    // 初期並びのまま確定すると馬番1が1着になり、購入した単勝が的中する
    const finalizeButton = adminPage.getByRole('button', { name: '着順を確定する' });
    await expect(finalizeButton).toBeEnabled({ timeout: 30_000 });
    await finalizeButton.click();
    await adminPage.getByRole('button', { name: '確定する', exact: true }).click();

    const payoutButton = adminPage.getByRole('button', { name: '払い戻しを確定する' });
    await expect(payoutButton).toBeEnabled({ timeout: 30_000 });
    await payoutButton.click();
    await expect(adminPage.getByText('払い戻し確定通知を送信しました')).toBeVisible({ timeout: 30_000 });
  });

  await test.step('的中表示と残高を検証', async () => {
    await userPage.goto(`/races/${fx.raceId}/standby`);
    await expect(userPage.getByText('的中', { exact: true }).first()).toBeVisible({ timeout: 30_000 });

    const state = await fetchSettlementState(fx.eventId);
    expect(state.betStatus).toBe('HIT');
    expect(state.betPayout).toBe(E2E.expectedPayout);
    // 最終残高 = 配布 - 購入 + 払戻 + 途中で借りた融資(配布と同額)
    expect(state.balance).toBe(E2E.distributeAmount - E2E.betAmount + E2E.expectedPayout + E2E.distributeAmount);
  });

  await userContext.close();
  await adminContext.close();
});
