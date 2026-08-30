'use client';

import type { ComponentProps } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from './button';

/**
 * form action の送信中に自動で無効化される送信ボタン。連打による多重サーバーアクション実行を防ぐ。
 * useFormStatus を使うため、<form> の内側に置くこと。
 */
export function SubmitButton({ disabled, ...props }: Omit<ComponentProps<typeof Button>, 'type'>) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending || disabled} {...props} />;
}
