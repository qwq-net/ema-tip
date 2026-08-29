'use client';

import { ROLES, ROLE_COLORS, ROLE_LABELS, type Role } from '@/entities/user';
import { narrowToOption } from '@/shared/utils/lookup';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { updateUserRole } from '../actions';

interface UserRoleSelectProps {
  userId: string;
  currentRole: Role;
}

export function UserRoleSelect({ userId, currentRole }: UserRoleSelectProps) {
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = narrowToOption(Object.values(ROLES), e.target.value) ?? currentRole;
    startTransition(async () => {
      try {
        await updateUserRole(userId, newRole);
        toast.success('役割を変更しました');
      } catch (error) {
        toast.error('役割の変更に失敗しました');
        console.error(error);
      }
    });
  };

  return (
    <select
      value={currentRole}
      onChange={handleChange}
      disabled={
        isPending || currentRole === ROLES.AI_USER || currentRole === ROLES.AI_TIPSTER || currentRole === ROLES.GUEST
      }
      className={`w-32 rounded border px-2 py-1 text-sm ${ROLE_COLORS[currentRole]} ${
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
