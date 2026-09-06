'use client';

import { ROLES, ROLE_COLORS, ROLE_LABELS, type Role } from '@/entities/user';
import { toast } from '@/shared/lib/toast';
import { narrowToOption } from '@/shared/utils/lookup';
import { useTransition } from 'react';
import { updateUserRole } from '../actions';

interface UserRoleSelectProps {
  userId: string;
  currentRole: Role;
  // 操作者自身の行。サーバーが自分の管理者権限の変更を拒否するため、操作できない状態で見せる
  isCurrentUser: boolean;
}

export function UserRoleSelect({ userId, currentRole, isCurrentUser }: UserRoleSelectProps) {
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

  return (
    <select
      value={currentRole}
      onChange={handleChange}
      disabled={
        isPending ||
        isCurrentUser ||
        currentRole === ROLES.AI_USER ||
        currentRole === ROLES.AI_TIPSTER ||
        currentRole === ROLES.GUEST
      }
      title={isCurrentUser ? '自身の管理者権限は変更できません' : undefined}
      className={`rounded-chip w-32 border px-2 py-1 text-sm ${ROLE_COLORS[currentRole]} ${
        currentRole === ROLES.AI_USER || currentRole === ROLES.AI_TIPSTER || currentRole === ROLES.GUEST
          ? 'cursor-not-allowed appearance-none opacity-80'
          : ''
      }`}
    >
      {Object.values(ROLES)
        .filter((role) =>
          currentRole === ROLES.AI_USER || currentRole === ROLES.AI_TIPSTER || currentRole === ROLES.GUEST
            ? role === currentRole
            : role !== ROLES.AI_USER && role !== ROLES.AI_TIPSTER && role !== ROLES.GUEST
        )
        .map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
    </select>
  );
}
