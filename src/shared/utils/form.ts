import type React from 'react';

export function preventEnterSubmit(e: React.KeyboardEvent<HTMLFormElement>) {
  if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type !== 'submit') {
    e.preventDefault();
  }
}

export function getPasswordManagerIgnoreAttributes(ignore: boolean): React.InputHTMLAttributes<HTMLInputElement> {
  if (!ignore) return {};

  // SAFETY: data-* 属性は JSX では有効だが React の属性型に index が無いため型を合わせる
  return {
    'data-1p-ignore': 'true',
    'data-lpignore': 'true',
    'data-protonpass-ignore': 'true',
    autoComplete: 'off',
  } as React.InputHTMLAttributes<HTMLInputElement>;
}

/** FormData から文字列フィールドを取り出す。未設定・ファイルの場合は空文字を返す。 */
export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return value instanceof File ? '' : (value ?? '');
}
