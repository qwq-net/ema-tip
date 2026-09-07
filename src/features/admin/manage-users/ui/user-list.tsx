'use client';

import type { Role } from '@/entities/user';
import { Badge, TableBody, TableEmptyRow, TableHead, TableRow, TableShell, Td, Th } from '@/shared/ui';
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

type TabType = 'ALL_USERS' | 'GUEST' | 'AI';

export function UserList({ users, currentUserId }: UserListProps) {
  const [activeTab, setActiveTab] = useState<TabType>('ALL_USERS');

  const filteredUsers = users.filter((user) => {
    if (activeTab === 'GUEST') return user.role === 'GUEST';
    if (activeTab === 'AI') return user.role === 'AI_USER' || user.role === 'AI_TIPSTER';
    return !['GUEST', 'AI_USER', 'AI_TIPSTER'].includes(user.role);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="rounded-control flex space-x-1 bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab('ALL_USERS')}
            className={clsx(
              'rounded-control px-3 py-1.5 text-sm font-semibold transition',
              activeTab === 'ALL_USERS' ? 'text-text-main bg-white' : 'text-text-sub hover:text-text-main'
            )}
          >
            ユーザー
          </button>
          <button
            onClick={() => setActiveTab('GUEST')}
            className={clsx(
              'rounded-control px-3 py-1.5 text-sm font-semibold transition',
              activeTab === 'GUEST' ? 'text-text-main bg-white' : 'text-text-sub hover:text-text-main'
            )}
          >
            ゲスト
          </button>
          <button
            onClick={() => setActiveTab('AI')}
            className={clsx(
              'rounded-control px-3 py-1.5 text-sm font-semibold transition',
              activeTab === 'AI' ? 'text-text-main bg-white' : 'text-text-sub hover:text-text-main'
            )}
          >
            AI
          </button>
        </div>

        <Link
          href="/admin/users/guests"
          className="rounded-control text-text-main inline-flex items-center bg-white px-3 py-2 text-sm font-semibold ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
        >
          ゲストコード管理
        </Link>
      </div>

      <TableShell>
        <TableHead>
          <Th>ユーザー</Th>
          <Th>ID</Th>
          <Th>ロール</Th>
          <Th>ステータス</Th>
          <Th>操作</Th>
        </TableHead>
        <TableBody>
          {filteredUsers.length === 0 ? (
            <TableEmptyRow colSpan={5}>該当するユーザーがいません</TableEmptyRow>
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
                        alt="User Icon"
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
                      <div className="text-text-main font-semibold">{user.name || '名前なし'}</div>
                      <div className="text-text-sub text-sm">{user.accounts[0]?.provider || 'credential'}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <code className="rounded-chip text-text-sub bg-gray-100 px-1.5 py-0.5 font-mono text-sm">
                      {user.id.substring(0, 8)}...
                    </code>
                    {user.id === currentUserId && <Badge variant="role" label="You" />}
                  </div>
                </Td>
                <Td>
                  <UserRoleSelect userId={user.id} currentRole={user.role} isCurrentUser={user.id === currentUserId} />
                </Td>
                <Td>
                  {user.disabledAt ? <Badge variant="status" label="無効" /> : <Badge variant="status" label="有効" />}
                </Td>
                <Td>
                  <UserActionsMenu
                    userId={user.id}
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
