const WRONG_CREDENTIALS = 'ユーザー名またはパスワードが間違っています。';

const COMMON_ERROR_MESSAGES = {
  RateLimitExceeded: '試行回数制限を超えました。しばらく待ってから再度お試しください。',
} satisfies Record<string, string>;

/** ゲストログインの signIn エラーコードに対応する日本語メッセージ。 */
export const LOGIN_ERROR_MESSAGES = {
  ...COMMON_ERROR_MESSAGES,
  UserNotFound: WRONG_CREDENTIALS,
  InvalidPassword: WRONG_CREDENTIALS,
  CredentialsSignin: WRONG_CREDENTIALS,
  UserSetupIncomplete: 'アカウント設定が完了していません。管理者にお問い合わせください。',
  AccountDisabled: 'このアカウントは無効化されています。',
} satisfies Record<string, string>;

/** ゲスト新規登録の signIn・事前バリデーションのエラーコードに対応する日本語メッセージ。 */
export const SIGNUP_ERROR_MESSAGES = {
  ...COMMON_ERROR_MESSAGES,
  InvalidGuestCode: '無効な招待コードです。',
  UsernameTaken: 'このユーザー名は既に使用されています。',
  CredentialsSignin: '登録に失敗しました。入力内容を確認してください。',
} satisfies Record<string, string>;

/**
 * 認証エラーコードを利用者向けの日本語メッセージへ変換する。
 * messages に載っていないコードは fallback をそのまま返す。
 * IPロックの残り時間つきメッセージなど、コード単体で決まらないものは呼び手側で分岐する。
 */
export function getAuthErrorMessage(code: string, messages: Record<string, string>, fallback: string): string {
  return messages[code] ?? fallback;
}
