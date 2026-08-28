/**
 * ユーザーに見せてよい想定内の業務エラー。
 * runAction がこのクラスだけを { success: false, error } へ変換し、
 * それ以外の例外はメッセージを漏らさず汎用文言に落とす。
 */
export class ActionError extends Error {}

export type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

/**
 * Server Action の本体を包み、例外を ActionResult に変換して返す。
 * 本番の Next.js は Server Action の throw メッセージをマスクするため、
 * クライアントに文言を見せたいエラーは throw ではなくこの戻り値で返す必要がある。
 * ActionError はそのメッセージを、それ以外の例外はログした上で汎用文言を返す。
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { success: true, data: await fn() };
  } catch (error) {
    if (error instanceof ActionError) {
      return { success: false, error: error.message };
    }
    console.error('Unexpected action error:', error);
    return { success: false, error: 'エラーが発生しました' };
  }
}
