import { vi } from 'vitest';

// 全テスト共通の定型モック。ここで一括定義し、各テストファイルの重複記述を排除する。
// ファイル固有の挙動が必要な場合は、そのファイル内の vi.mock が優先される。

// next-auth の実初期化はテストでは不要。requireUser / requireAdmin の分岐は
// 各テストが '@/shared/utils/admin' 側をモックして制御する
vi.mock('@/shared/config/auth', () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// RACE_EVENTS 定数は実物を使い、emit だけを監視可能なモックへ差し替える
vi.mock('@/shared/lib/sse/event-emitter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/sse/event-emitter')>();
  return {
    ...actual,
    raceEventEmitter: { emit: vi.fn() },
  };
});
