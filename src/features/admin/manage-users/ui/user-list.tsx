'use client';

import { Role } from '@/entities/user';
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
        <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab('ALL_USERS')}
            className={clsx(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              activeTab === 'ALL_USERS' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            )}
          >
            ユーザー
          </button>
          <button
            onClick={() => setActiveTab('GUEST')}
            className={clsx(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              activeTab === 'GUEST' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            )}
          >
            ゲスト
          </button>
          <button
            onClick={() => setActiveTab('AI')}
            className={clsx(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              activeTab === 'AI' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            )}
          >
            AI
          </button>
        </div>

        <Link
          href="/admin/users/guests"
          className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
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
                className={clsx(user.disabledAt && 'bg-red-50 text-gray-500 hover:bg-red-100/50')}
              >
                <Td>
                  <div className="flex items-center gap-3">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt="User Icon"
                        width={32}
                        height={32}
                        className="rounded-full shadow-sm ring-1 ring-gray-200"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-sm font-semibold text-gray-400">
                        ?
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{user.name || '名前なし'}</div>
                      <div className="text-sm text-gray-400">{user.accounts[0]?.provider || 'credential'}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-gray-500">
                      {user.id.substring(0, 8)}...
                    </code>
                    {user.id === currentUserId && <Badge variant="role" label="You" />}
                  </div>
                </Td>
                <Td>
                  <UserRoleSelect userId={user.id} currentRole={user.role} />
                </Td>
                <Td>
                  {user.disabledAt ? <Badge variant="status" label="無効" /> : <Badge variant="status" label="有効" />}
                </Td>
                <Td>
                  <UserActionsMenu
                    userId={user.id}
                    isDisabled={!!user.disabledAt}
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
