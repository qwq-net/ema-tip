'use client';

import { ROLES, ROLE_LABELS, type Role } from '@/entities/user';
import { toast } from '@/shared/lib/toast';
import { Badge } from '@/shared/ui';
import { narrowToOption } from '@/shared/utils/lookup';
import { useTransition } from 'react';
import { updateUserRole } from '../actions';

interface UserRoleSelectProps {
  userId: string;
  // 行の対象ユーザー名。select の読み上げでどの行かを判別するために使う
  userName: string;
  currentRole: Role;
  // 操作者自身の行。サーバーが自分の管理者権限の変更を拒否するため、操作できない状態で見せる
  isCurrentUser: boolean;
}

/** 役割を変更する select。自分と AI とゲストの行は変更できないので Badge で役割名だけを出す。 */
export function UserRoleSelect({ userId, userName, currentRole, isCurrentUser }: UserRoleSelectProps) {
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = narrowToOption(Object.values(ROLES), e.target.value) ?? currentRole;
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('役割を変更しました');
    });
  };

  const isFixedRole = currentRole === ROLES.AI_USER || currentRole === ROLES.AI_TIPSTER || currentRole === ROLES.GUEST;

  if (isCurrentUser || isFixedRole) return <Badge label={ROLE_LABELS[currentRole]} />;

  return (
    <select
      value={currentRole}
      onChange={handleChange}
      disabled={isPending}
      aria-label={`${userName} の役割`}
      className="rounded-chip w-32 border border-gray-300 bg-white px-2 py-1 text-sm"
    >
      {Object.values(ROLES)
        .filter((role) => role !== ROLES.AI_USER && role !== ROLES.AI_TIPSTER && role !== ROLES.GUEST)
        .map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
    </select>
  );
}
