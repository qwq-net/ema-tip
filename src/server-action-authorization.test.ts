import { ROLES } from '@/entities/user/constants';
import { auth } from '@/shared/config/auth';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// requireAdmin / requireUserは実物を通す。認可前のDBアクセスは読み取りも含めて失敗させる。
const { databaseAccess } = vi.hoisted(() => ({
  databaseAccess: vi.fn(() => {
    throw new Error('認可前にDBへアクセスしました');
  }),
}));
vi.mock('@/shared/db', () => ({ db: new Proxy({}, { get: databaseAccess }) }));
vi.mock('@/shared/lib/notify', () => ({ notifyError: vi.fn() }));

function serverActionFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return serverActionFiles(file);
    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) return [];
    return /^['"]use server['"]/.test(readFileSync(file, 'utf8')) ? [file] : [];
  });
}

type DeniedResult = { success: false; error: string } | null;
const actions: { name: string; adminOnly: boolean; forecastOnly: boolean; run: () => Promise<DeniedResult> }[] = [];
for (const file of serverActionFiles(__dirname)) {
  // 登録前検証とログイン開始は、未ログインでの呼び出しが必要な公開処理。
  if (file.endsWith('/features/auth/actions/auth-actions.ts')) continue;
  const actionModule = (await import(file)) as Record<string, (...args: unknown[]) => Promise<DeniedResult>>;
  for (const [name, action] of Object.entries(actionModule)) {
    const forecastOnly = name === 'upsertForecast' || name === 'getRaces';
    const adminOnly =
      (file.includes('/features/admin/') && !['getRaceById', 'getEntriesForRace', 'getRaces'].includes(name)) ||
      ['getAdminEventRanking', 'getBet5TicketsAction', 'updateRankingDisplayMode'].includes(name);
    // 認可より先に引数を分割代入するActionにも渡せる形。値の妥当性より先に認可されることを検査する。
    actions.push({ name, adminOnly, forecastOnly, run: () => action({}, {}, {}) });
  }
}

const nullOnUnauthorized = new Set(['getRaceById', 'getMyForecast']);

async function expectDenied(action: (typeof actions)[number]) {
  let result: unknown;
  try {
    result = await action.run();
  } catch (error) {
    result = error;
  }
  expect(databaseAccess).not.toHaveBeenCalled();
  if (nullOnUnauthorized.has(action.name)) {
    expect(result).toBeNull();
  } else if (result instanceof Error) {
    expect(result.message).toMatch(/認証されていません|Unauthorized/);
  } else {
    expect(result).toEqual({ success: false, error: '認証されていません' });
  }
}

describe('Server Actionを直接呼んだ場合の認可', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('更新処理と参照処理、cacheで包んだexportも収集する', () => {
    expect(actions.map((action) => action.name)).toEqual(
      expect.arrayContaining([
        'placeBets',
        'placeBet5BetAction',
        'finalizePayout',
        'updateUserRole',
        'getEvent',
        'getRaceById',
      ])
    );
    expect(actions.length).toBeGreaterThan(70);
  });

  describe.each([null, { user: null }, { user: { role: 'ADMIN' } }])('無効なセッション %j', (session) => {
    it.each(actions)('$name はDBに触れず拒否する', async (action) => {
      vi.mocked(auth).mockResolvedValue(session as never);
      await expectDenied(action);
    });
  });

  describe.each(Object.values(ROLES).filter((role) => role !== ROLES.ADMIN))('管理者以外: %s', (role) => {
    it.each(actions.filter((action) => action.adminOnly))('$name は管理操作を拒否する', async (action) => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1', role } } as never);
      await expectDenied(action);
    });
  });

  describe.each([ROLES.USER, ROLES.GUEST, ROLES.AI_USER, ROLES.AI_TIPSTER])('予想編集権限なし: %s', (role) => {
    it.each(actions.filter((action) => action.forecastOnly))('$name は予想管理を拒否する', async (action) => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1', role } } as never);
      await expectDenied(action);
    });
  });
});
