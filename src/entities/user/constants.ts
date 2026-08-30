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

/** 表示名に許可する文字。英数字・ひらがな・カタカナ・漢字のみで、空白・記号・絵文字は不可。 */
export const VALID_NAME_REGEX = /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/;

/** 表示名の最大文字数。ランキング等のレイアウト崩れ防止。 */
export const MAX_NAME_LENGTH = 20;

/** 表示名として妥当か。ゲスト登録・オンボーディング・名前変更で共通に使う。 */
export function isValidUserName(name: string): boolean {
  return name.length > 0 && name.length <= MAX_NAME_LENGTH && VALID_NAME_REGEX.test(name);
}
