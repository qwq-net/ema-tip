import { headers } from 'next/headers';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { getClientIp } from './get-client-ip';

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

// RFC 5737 がドキュメント用に予約したアドレス。実在の宛先と取り違えられない
const DOC_IP = '192.0.2.1';
const DOC_IP_ALT = '198.51.100.1';
const DOC_IP_ALT2 = '203.0.113.1';

describe('utils/get-client-ip', () => {
  it('cf-connecting-ipが存在する場合、それを返すこと', async () => {
    (headers as Mock).mockResolvedValue(new Map([['cf-connecting-ip', DOC_IP]]));
    const ip = await getClientIp();
    expect(ip).toBe(DOC_IP);
  });

  it('偽装可能なx-real-ip・x-forwarded-forは無視して127.0.0.1にフォールバックすること', async () => {
    (headers as Mock).mockResolvedValue(
      new Map([
        ['x-real-ip', DOC_IP],
        ['x-forwarded-for', `${DOC_IP_ALT}, ${DOC_IP_ALT2}`],
      ])
    );
    const ip = await getClientIp();
    expect(ip).toBe('127.0.0.1');
  });

  it('ヘッダーがない場合、127.0.0.1にフォールバックすること', async () => {
    (headers as Mock).mockResolvedValue(new Map());
    const ip = await getClientIp();
    expect(ip).toBe('127.0.0.1');
  });
});
