'use server';

import { signOut } from '@/shared/config/auth';

/**
 * 現在のセッションを破棄してログイン画面へ遷移させる。
 * ログアウト導線そのもののため認可ガードを持たない。
 */
export async function logout() {
  await signOut({ redirectTo: '/login' });
}
