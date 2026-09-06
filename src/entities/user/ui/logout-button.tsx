import { Button } from '@/shared/ui';
import type { ComponentProps } from 'react';

type LogoutButtonProps = ComponentProps<typeof Button>;

/** ログアウトボタン。JavaScript に頼らない素のフォーム送信で /logout の Route Handler を呼ぶ。 */
export function LogoutButton({ className, variant = 'ghost', ...props }: LogoutButtonProps) {
  return (
    <form method="post" action="/logout">
      <Button variant={variant} type="submit" className={className} {...props}>
        ログアウト
      </Button>
    </form>
  );
}
