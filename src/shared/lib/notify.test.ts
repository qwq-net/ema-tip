import { redis } from '@/shared/lib/redis';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyError, resetNotifyStateForTest } from './notify';

vi.mock('@/shared/lib/redis', () => ({
  redis: { incr: vi.fn(), expire: vi.fn() },
}));

const WEBHOOK = 'https://discord.com/api/webhooks/test';

function mockFetchOk() {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('notifyError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNotifyStateForTest();
    vi.stubEnv('DISCORD_WEBHOOK_URL', WEBHOOK);
    (redis.incr as unknown as Mock).mockResolvedValue(1);
    (redis.expire as unknown as Mock).mockResolvedValue(1);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('日時と引用とコードブロックの順で組み立てる', async () => {
    const fetchMock = mockFetchOk();

    await notifyError({
      kind: 'infra',
      title: 'Redis へ接続できません',
      detail: 'connect ECONNREFUSED 172.18.0.3:6379',
    });

    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as { body: string }).body) as { content: string };
    const lines = body.content.split('\n');

    expect(lines[0]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
    expect(lines[1]).toBe('');
    expect(lines[2]).toBe('> 基盤の異常 Redis へ接続できません');
    expect(body.content).toContain('```\nconnect ECONNREFUSED 172.18.0.3:6379\n```');
  });

  it('件数と文脈は引用の中へ続けて出す', async () => {
    (redis.incr as unknown as Mock).mockResolvedValue(10);
    const fetchMock = mockFetchOk();

    await notifyError({
      kind: 'money',
      title: '購入後のオッズ再計算に失敗しました',
      context: { raceId: 'race-1' },
    });

    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as { body: string }).body) as { content: string };
    expect(body.content).toContain('> 10 件目');
    expect(body.content).toContain('> raceId=race-1');
  });

  it('1 件目は件数の行を出さない', async () => {
    const fetchMock = mockFetchOk();

    await notifyError({ kind: 'infra', title: 'Redis へ接続できません' });

    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as { body: string }).body) as { content: string };
    expect(body.content).not.toContain('件目');
  });

  it('スタックは詳細と同じコードブロックへ続ける', async () => {
    const fetchMock = mockFetchOk();
    const cause = new Error('boom');

    await notifyError({ kind: 'action', title: '失敗しました', detail: 'boom', cause });

    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as { body: string }).body) as { content: string };
    expect(body.content.match(/```/g)).toHaveLength(2);
    expect(body.content).toContain('Error: boom');
  });

  it('webhook が未設定なら送信しない', async () => {
    vi.stubEnv('DISCORD_WEBHOOK_URL', '');
    const fetchMock = mockFetchOk();

    await notifyError({ kind: 'infra', title: 'Redis 接続断' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('初回の発生は送信する', async () => {
    const fetchMock = mockFetchOk();

    await notifyError({ kind: 'infra', title: 'Redis 接続断' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(WEBHOOK);
  });

  it('同じ内容の 2 回目から 9 回目までは抑制する', async () => {
    const fetchMock = mockFetchOk();

    for (const count of [2, 3, 9]) {
      (redis.incr as unknown as Mock).mockResolvedValue(count);
      await notifyError({ kind: 'infra', title: 'Redis 接続断' });
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('10 件目と 100 件目は件数を添えて再び送信する', async () => {
    const fetchMock = mockFetchOk();

    (redis.incr as unknown as Mock).mockResolvedValue(10);
    await notifyError({ kind: 'infra', title: 'Redis 接続断' });
    (redis.incr as unknown as Mock).mockResolvedValue(100);
    await notifyError({ kind: 'infra', title: 'Redis 接続断' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body = (fetchMock.mock.calls[1]?.[1] as { body: string }).body;
    expect(body).toContain('100');
  });

  it('内容が違えば別々に数える', async () => {
    const fetchMock = mockFetchOk();

    await notifyError({ kind: 'infra', title: 'Redis 接続断' });
    await notifyError({ kind: 'infra', title: 'DB 接続断' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('送信が失敗しても例外を投げない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(notifyError({ kind: 'infra', title: 'Redis 接続断' })).resolves.toBeUndefined();
  });

  it('Redis が落ちていても送信する', async () => {
    (redis.incr as unknown as Mock).mockRejectedValue(new Error('redis down'));
    const fetchMock = mockFetchOk();

    await notifyError({ kind: 'infra', title: 'Redis 接続断' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('Redis の応答が返らなくても短時間で諦めて送信する', async () => {
    // ioredis は接続断のときコマンドを待たせる。実測で 19 秒かかり、
    // Redis 断を知らせる通知がその分遅れていた
    (redis.incr as unknown as Mock).mockReturnValue(new Promise(() => undefined));
    const fetchMock = mockFetchOk();

    const started = Date.now();
    await notifyError({ kind: 'infra', title: 'Redis 接続断' });
    const elapsed = Date.now() - started;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(elapsed).toBeLessThan(3000);
  });

  it('Redis が落ちている間も同じ内容は抑制する', async () => {
    (redis.incr as unknown as Mock).mockRejectedValue(new Error('redis down'));
    const fetchMock = mockFetchOk();

    await notifyError({ kind: 'infra', title: 'Redis 接続断' });
    await notifyError({ kind: 'infra', title: 'Redis 接続断' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
