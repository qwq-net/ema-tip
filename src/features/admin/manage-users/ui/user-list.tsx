'use client';

import type { Role } from '@/entities/user';
import { SegmentedControl } from '@/features/admin/shared/ui/segmented-control';
import { Badge, Button, TableBody, TableEmptyRow, TableHead, TableRow, TableShell, Td, Th } from '@/shared/ui';
import { lookup } from '@/shared/utils/lookup';
import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { UserActionsMenu } from './user-actions-menu';
import { UserRoleSelect } from './user-role-select';

interface User {
  id: string;
  name: string | null;
  image: string | null;
  role: Role;
  disabledAt: Date | null;
  createdAt: Date;
  accounts: {
    provider: string;
  }[];
}

interface UserListProps {
  users: User[];
  currentUserId: string;
}

const TAB_OPTIONS = [
  { value: 'ALL_USERS', label: 'ユーザー' },
  { value: 'GUEST', label: 'ゲスト' },
  { value: 'AI', label: 'AI' },
] as const;

type TabType = (typeof TAB_OPTIONS)[number]['value'];

// ログイン手段の表示名。accounts を持たないユーザーはゲストコードでの登録
const PROVIDER_LABELS = {
  discord: 'Discord',
} satisfies Record<string, string>;

const PROVIDER_FALLBACK = 'ゲストコード';

export function UserList({ users, currentUserId }: UserListProps) {
  const [activeTab, setActiveTab] = useState<TabType>('ALL_USERS');

  const filteredUsers = users.filter((user) => {
    if (activeTab === 'GUEST') return user.role === 'GUEST';
    if (activeTab === 'AI') return user.role === 'AI_USER' || user.role === 'AI_TIPSTER';
    return !['GUEST', 'AI_USER', 'AI_TIPSTER'].includes(user.role);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl options={TAB_OPTIONS} value={activeTab} onChange={setActiveTab} />

        <Button asChild variant="secondary">
          <Link href="/admin/users/guests">ゲストコード管理</Link>
        </Button>
      </div>

      <TableShell>
        <TableHead>
          <Th>ユーザー</Th>
          <Th>ロール</Th>
          <Th>ステータス</Th>
          <Th>操作</Th>
        </TableHead>
        <TableBody>
          {filteredUsers.length === 0 ? (
            <TableEmptyRow colSpan={4}>該当するユーザーがいません</TableEmptyRow>
          ) : (
            filteredUsers.map((user) => (
              <TableRow
                key={user.id}
                className={clsx(user.disabledAt && 'text-text-sub bg-red-50 hover:bg-red-100/50')}
              >
                <Td>
                  <div className="flex items-center gap-3">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt=""
                        width={32}
                        height={32}
                        className="rounded-full ring-1 ring-gray-200"
                      />
                    ) : (
                      <div className="text-text-sub flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-sm font-semibold">
                        ?
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-text-main font-semibold">{user.name || '名前なし'}</span>
                        {user.id === currentUserId && <Badge variant="role" label="自分" />}
                      </div>
                      <div className="text-text-sub text-sm">
                        {lookup(PROVIDER_LABELS, user.accounts[0]?.provider ?? '') ?? PROVIDER_FALLBACK}
                      </div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <UserRoleSelect
                    userId={user.id}
                    userName={user.name ?? '名前なし'}
                    currentRole={user.role}
                    isCurrentUser={user.id === currentUserId}
                  />
                </Td>
                <Td>
                  {user.disabledAt ? <Badge variant="status" label="無効" /> : <Badge variant="status" label="有効" />}
                </Td>
                <Td>
                  <UserActionsMenu
                    userId={user.id}
                    userName={user.name ?? '名前なし'}
                    isDisabled={Boolean(user.disabledAt)}
                    isCurrentUser={user.id === currentUserId}
                  />
                </Td>
              </TableRow>
            ))
          )}
        </TableBody>
      </TableShell>
    </div>
  );
}
