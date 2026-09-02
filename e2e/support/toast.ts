import { expect, type Locator, type Page } from '@playwright/test';

/**
 * 保存ボタンを押し、成功 toast の出現で完了を待つ。
 * 同文言の toast が前の保存から残っていると、新しい保存の完了前に
 * 後続の検証へ進んでしまうため、押す前に既存 toast の消滅を待つ。
 * scope を渡すと同名ボタンが複数あるページでカード内へ限定できる。
 */
export async function saveAndExpectToast(page: Page, buttonName: string, toastText: string, scope?: Locator) {
  await expect(page.getByText(toastText)).toHaveCount(0, { timeout: 10_000 });
  await (scope ?? page).getByRole('button', { name: buttonName }).click();
  await expect(page.getByText(toastText).last()).toBeVisible();
}
