'use client';

import { splitGraphemes } from '@/shared/utils/graphemes';
import { useState } from 'react';

/**
 * 絵文字パスワード入力の状態と EmojiKeypad 用ハンドラをまとめたフック。
 * ゲストログイン・ゲスト新規登録のパスワード入力欄で使う。
 *
 * handleEmojiClick は書記素単位で6文字を上限とし、超過分は無視する。
 * handleBackspace は書記素単位で末尾1文字を削除する。
 * setPassword は隠し input からの直接入力向けで、上限を課さない。
 */
export function useEmojiPassword() {
  const [password, setPassword] = useState('');

  const handleEmojiClick = (emoji: string) => {
    if (splitGraphemes(password).length >= 6) return;
    setPassword((prev) => prev + emoji);
  };

  const handleBackspace = () => {
    const chars = splitGraphemes(password);
    chars.pop();
    setPassword(chars.join(''));
  };

  const handleClear = () => {
    setPassword('');
  };

  return { password, setPassword, handleEmojiClick, handleBackspace, handleClear };
}
