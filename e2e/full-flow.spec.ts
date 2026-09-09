import { expect, test, type Page } from '@playwright/test';
import { splitGraphemes } from '../src/shared/utils/graphemes';
import { cleanupFixtures, E2E, fetchSettlementState, setupFixtures, type Fixtures } from './support/fixtures';
import { saveAndExpectToast } from './support/toast';

/**
 * お金の一本道を通しで検証する唯一のE2E。
 * 2 人のゲストが登録 → イベント参加 → 単勝購入し、管理者が締切・着順確定・払戻確定する。
 * 馬番1を買った太郎は的中、馬番2を買った次郎は不的中になる。
 * 締切と結果はページ遷移なしで届くことを確認し、SSE の配信経路の退行を検出する。
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
  for (const emoji of splitGraphemes(E2E.password)) {
    await page.getByRole('button', { name: `${emoji} を入力` }).click();
  }
}

// ゲストコードで登録して mypage へ到達するまで
async function signupGuest(page: Page, name: string) {
  await page.goto('/signup/guest');
  await page.locator('#code').fill(E2E.guestCode);
  await page.locator('#username').fill(name);
  await typeEmojiPassword(page);
  await page.getByRole('button', { name: '登録して参加' }).click();
  await page.waitForURL('**/mypage', { timeout: 30_000 });
}

// イベントに参加して軍資金を受け取る。
// カードは見出しと参加ボタンを両方持つ最も内側の div。参加後はボタンの文言が参加済みへ変わるため、
// 参加する だけで絞ると開催中イベントがこれ 1 件だけの環境でカードを見失う
async function joinEvent(page: Page) {
  await page.goto('/mypage/claim');
  const card = page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: E2E.eventName }) })
    .filter({ has: page.getByRole('button', { name: /参加する|参加済み/ }) })
    .last();
  await card.getByRole('button', { name: '参加する' }).click();
  await expect(card.getByRole('button', { name: '参加済み' })).toBeVisible();
}

// 指定馬番の単勝を 100 円買い、トーストと残高減算を確認する
async function buyWin(page: Page, horseNumber: number, horseName: string, balanceBefore: number) {
  await page.goto(`/races/${fx.raceId}`);
  await page.getByRole('checkbox', { name: `1着候補 に${horseName}(${horseNumber}番)を選択` }).check();
  await page.getByRole('button', { name: '購入確定' }).click();
  await page.getByRole('button', { name: '購入する' }).click();
  await expect(page.getByText('円分の馬券を購入しました')).toBeVisible();

  // 購入アクションは revalidatePath を持たず、画面反映は呼び手の router.refresh だけが担う。
  // 反映経路の退行を検出するため、トーストに加えて残高の減算まで検証する
  const balanceAfter = (balanceBefore - E2E.betAmount).toLocaleString('ja-JP');
  await expect(page.getByText(`${balanceAfter}円`)).toBeVisible();
}

test('2 人のゲスト登録から払戻確定までの一本道', async ({ browser }) => {
  const userContext = await browser.newContext();
  const userPage = await userContext.newPage();
  const loserContext = await browser.newContext();
  const loserPage = await loserContext.newPage();

  await test.step('太郎がゲストコードで新規登録してイベントに参加', async () => {
    await signupGuest(userPage, E2E.guestName);
    await joinEvent(userPage);
  });

  await test.step('太郎が馬番1の単勝を100円購入', async () => {
    await buyWin(userPage, 1, fx.horse1Name, E2E.distributeAmount);
    // 唯一のベットなので馬番1が1番人気になる。SSE経由のオッズ更新で人気表示が届くことも兼ねて検証する
    await expect(userPage.getByText('1人気')).toBeVisible();
  });

  await test.step('次郎が同じコードで登録して参加し、馬番2の単勝を100円購入', async () => {
    await signupGuest(loserPage, E2E.loserName);
    await joinEvent(loserPage);
    await buyWin(loserPage, 2, fx.horse2Name, E2E.distributeAmount);
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

  // 馬券種別カードは保証オッズカードと同名の保存ボタンを持つため、カード内へスコープして操作する
  const betTypesCard = adminPage
    .locator('div')
    .filter({ has: adminPage.getByRole('checkbox', { name: 'このレースで個別に指定する' }) })
    .last();

  await test.step('管理者がレースの購入可能種別を3連単以外へ制限する', async () => {
    await adminPage.goto(`/admin/races/${fx.raceId}`);
    await adminPage.getByRole('checkbox', { name: 'このレースで個別に指定する' }).check();
    await adminPage.getByRole('checkbox', { name: '3連単', exact: true }).uncheck();
    await saveAndExpectToast(adminPage, '保存する', '購入可能な馬券種別を更新しました', betTypesCard);

    await userPage.goto(`/races/${fx.raceId}`);
    await expect(userPage.getByText('このレースで購入できるのは')).toBeVisible();
    await expect(userPage.getByRole('button', { name: '3連単', exact: true })).toBeDisabled();
    await expect(userPage.getByRole('button', { name: '単勝', exact: true })).toBeEnabled();
  });

  await test.step('個別指定を解除すると全種別が購入可能へ戻る', async () => {
    await adminPage.getByRole('checkbox', { name: 'このレースで個別に指定する' }).uncheck();
    await saveAndExpectToast(adminPage, '保存する', '購入可能な馬券種別を更新しました', betTypesCard);

    await userPage.goto(`/races/${fx.raceId}`);
    await expect(userPage.getByText('このレースで購入できるのは')).toBeHidden();
    await expect(userPage.getByRole('button', { name: '3連単', exact: true })).toBeEnabled();
  });

  await test.step('融資は発生条件を満たすまで表示されない', async () => {
    await userPage.goto(`/races/${fx.raceId}`);
    await expect(userPage.getByText('資金が少し不足していませんか？')).toBeHidden();
  });

  await test.step('管理者が発生条件を100%へ変更すると案内が出る', async () => {
    await adminPage.goto(`/admin/events/${fx.eventId}/settings`);
    await adminPage.getByLabel('融資の発生条件').fill('100');
    await saveAndExpectToast(adminPage, '更新する', 'イベント情報を更新しました');

    await userPage.reload();
    await expect(userPage.getByText('資金が少し不足していませんか？')).toBeVisible();
  });

  await test.step('借入機能をOFFにすると案内が消える', async () => {
    await adminPage.getByLabel('借入機能を有効にする').uncheck();
    await saveAndExpectToast(adminPage, '更新する', 'イベント情報を更新しました');

    await userPage.reload();
    await expect(userPage.getByText('資金が少し不足していませんか？')).toBeHidden();
  });

  await test.step('ONへ戻すと借用証モーダルから借入できる', async () => {
    await adminPage.getByLabel('借入機能を有効にする').check();
    await saveAndExpectToast(adminPage, '更新する', 'イベント情報を更新しました');

    await userPage.reload();
    await userPage.getByText('資金が少し不足していませんか？').click();
    await expect(userPage.getByText('借用証')).toBeVisible();
    await userPage.getByRole('button', { name: '10,000円で最終直線へ' }).click();
    await expect(userPage.getByText('10,000円を借り入れました')).toBeVisible();
    await expect(userPage.getByText('資金が少し不足していませんか？')).toBeHidden();

    // 借入後残高 = 配布 - 購入 + 融資(配布と同額)
    const state = await fetchSettlementState(fx.eventId, fx.raceId, E2E.guestName);
    expect(state.balance).toBe(E2E.distributeAmount - E2E.betAmount + E2E.distributeAmount);
  });

  await test.step('締切がページ遷移なしで太郎の画面へ届く', async () => {
    await userPage.goto(`/races/${fx.raceId}`);
    await expect(userPage.getByText('このレースは受付を終了しました')).toBeHidden();

    await adminPage.goto(`/admin/races/${fx.raceId}`);
    await adminPage.getByRole('button', { name: '手動で受付を終了する' }).click();

    // goto も reload もしない。SSE の RACE_CLOSED が届いて router.refresh されることを待つ
    await expect(userPage.getByText('このレースは受付を終了しました')).toBeVisible({ timeout: 30_000 });
  });

  await test.step('着順確定と払戻確定が待機画面へページ遷移なしで届く', async () => {
    await userPage.goto(`/races/${fx.raceId}/standby`);
    await loserPage.goto(`/races/${fx.raceId}/standby`);
    await expect(userPage.getByText('的中', { exact: true })).toHaveCount(0);
    await expect(loserPage.getByText('不的中', { exact: true })).toHaveCount(0);

    // 初期並びのまま確定すると馬番1が1着になり、太郎の単勝が的中し次郎は外れる
    const finalizeButton = adminPage.getByRole('button', { name: '着順を確定する' });
    await expect(finalizeButton).toBeEnabled({ timeout: 30_000 });
    await finalizeButton.click();
    await adminPage.getByRole('button', { name: '確定する', exact: true }).click();

    const payoutButton = adminPage.getByRole('button', { name: '払戻を確定する' });
    await expect(payoutButton).toBeEnabled({ timeout: 30_000 });
    await payoutButton.click();
    // 払戻確定は確認ダイアログを経る。ダイアログ側の確定ボタンも同じ名前なので alertdialog の中から選ぶ
    await adminPage.getByRole('alertdialog').getByRole('button', { name: '払戻を確定する' }).click();
    await expect(adminPage.getByText('払戻確定通知を送信しました')).toBeVisible({ timeout: 30_000 });

    // RACE_BROADCAST が両者に届き、router.refresh で購入馬券の判定が更新される
    await expect(userPage.getByText('的中', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    await expect(loserPage.getByText('不的中', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  });

  await test.step('DB で的中と不的中の金額を検証', async () => {
    const winner = await fetchSettlementState(fx.eventId, fx.raceId, E2E.guestName);
    expect(winner.bets).toEqual([{ status: 'HIT', payout: E2E.expectedPayout }]);
    // 最終残高 = 配布 - 購入 + 払戻 + 途中で借りた融資(配布と同額)
    expect(winner.balance).toBe(E2E.distributeAmount - E2E.betAmount + E2E.expectedPayout + E2E.distributeAmount);

    const loser = await fetchSettlementState(fx.eventId, fx.raceId, E2E.loserName);
    expect(loser.bets).toEqual([{ status: 'LOST', payout: 0 }]);
    expect(loser.balance).toBe(E2E.distributeAmount - E2E.betAmount);
  });

  await userContext.close();
  await loserContext.close();
  await adminContext.close();
});
