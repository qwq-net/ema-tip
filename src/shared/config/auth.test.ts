import { db } from '@/shared/db';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import './auth';

// Auth.jsへの設定登録は実行し、外部通信なしで実際のsessionコールバックを検証する。
vi.unmock('@/shared/config/auth');
vi.mock('next-auth', () => ({
  default: vi.fn(() => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() })),
  CredentialsSignin: class extends Error {},
}));
vi.mock('@/shared/db', () => ({ db: { query: { users: { findFirst: vi.fn() } } } }));
vi.mock('@auth/drizzle-adapter', () => ({ DrizzleAdapter: vi.fn(() => ({})) }));

const config = vi.mocked(NextAuth).mock.calls[0]![0] as NextAuthConfig;
const refreshSession = config.callbacks!.session!;
type SessionInput = Parameters<typeof refreshSession>[0];

// JWT側に古い管理者情報が残っていても、DBの最新状態だけで認可する。
function input(sub: string | undefined = 'user-1'): SessionInput {
  return {
    session: {
      expires: '2099-01-01T00:00:00.000Z',
      user: { id: 'user-1', role: 'ADMIN', name: '旧名', isOnboardingCompleted: true },
    },
    token: { sub, role: 'ADMIN' },
  } as SessionInput;
}

describe('セッションの権限再確認', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('権限変更を反映し、JWTの古い管理者権限を使わない', async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user-1',
      role: 'USER',
      disabledAt: null,
      name: '新名',
      image: null,
      isOnboardingCompleted: true,
    } as never);
    const result = await refreshSession(input());
    expect(result.user).toMatchObject({ id: 'user-1', role: 'USER', name: '新名' });
  });

  it.each([undefined, { id: 'user-1', role: 'ADMIN', disabledAt: new Date() }])(
    '削除済み・停止済みのユーザーはセッションを無効にする: %j',
    async (user) => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(user as never);
      expect((await refreshSession(input())).user).toBeNull();
    }
  );

  it('DB照会に失敗したときは古いセッションで操作を許可しない', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      vi.mocked(db.query.users.findFirst).mockRejectedValue(new Error('database unavailable'));
      expect((await refreshSession(input())).user).toBeNull();
    } finally {
      log.mockRestore();
    }
  });

  it('ユーザーIDのないトークンでは操作を許可しない', async () => {
    const args = input();
    delete args.token.sub;
    expect((await refreshSession(args)).user).toBeNull();
    expect(db.query.users.findFirst).not.toHaveBeenCalled();
  });
});
