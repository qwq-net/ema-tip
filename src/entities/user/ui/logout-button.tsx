import { Button } from '@/shared/ui';
import type { ComponentProps } from 'react';
import { logout } from '../actions';

type LogoutButtonProps = ComponentProps<typeof Button>;

export function LogoutButton({ className, variant = 'ghost', ...props }: LogoutButtonProps) {
  return (
    <form action={logout}>
      <Button variant={variant} type="submit" className={className} {...props}>
        ログアウト
      </Button>
    </form>
  );
}
