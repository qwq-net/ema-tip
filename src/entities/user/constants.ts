export const ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  GUEST: 'GUEST',
  TIPSTER: 'TIPSTER',
  AI_TIPSTER: 'AI_TIPSTER',
  AI_USER: 'AI_USER',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS = {
  [ROLES.USER]: '一般ユーザー',
  [ROLES.ADMIN]: '管理者',
  [ROLES.GUEST]: 'ゲストアカウント',
  [ROLES.TIPSTER]: '予想屋',
  [ROLES.AI_TIPSTER]: 'AI予想屋',
  [ROLES.AI_USER]: 'AIユーザー',
} satisfies Record<Role, string>;

export const ROLE_COLORS = {
  [ROLES.ADMIN]: 'bg-blue-100 text-blue-700 border-blue-200',
  [ROLES.USER]: 'bg-green-100 text-green-700 border-green-200',
  [ROLES.GUEST]: 'bg-gray-100 text-gray-700 border-gray-200',
  [ROLES.TIPSTER]: 'bg-orange-100 text-orange-700 border-orange-200',
  [ROLES.AI_TIPSTER]: 'bg-purple-100 text-purple-700 border-purple-200',
  [ROLES.AI_USER]: 'bg-purple-100 text-purple-700 border-purple-200',
} satisfies Record<Role, string>;
