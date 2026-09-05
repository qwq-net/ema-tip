import type React from 'react';

export function preventEnterSubmit(e: React.KeyboardEvent<HTMLFormElement>) {
  if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type !== 'submit') {
    e.preventDefault();
  }
}

/** 主要なパスワードマネージャに入力欄を無視させる属性の組。入力要素へそのまま展開して使う */
interface PasswordManagerIgnoreAttributes {
  'data-1p-ignore'?: 'true';
  'data-lpignore'?: 'true';
  'data-protonpass-ignore'?: 'true';
  autoComplete?: 'off';
}

/** ignore が偽なら空を返す。呼び手は結果を常に展開してよく、無効時は属性が付かない */
export function getPasswordManagerIgnoreAttributes(ignore: boolean): PasswordManagerIgnoreAttributes {
  if (!ignore) return {};

  return {
    'data-1p-ignore': 'true',
    'data-lpignore': 'true',
    'data-protonpass-ignore': 'true',
    autoComplete: 'off',
  };
}

/** FormData から文字列フィールドを取り出す。未設定・ファイルの場合は空文字を返す。 */
export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return value instanceof File ? '' : (value ?? '');
}
