import { headers } from 'next/headers';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { getClientIp } from './get-client-ip';

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

describe('utils/get-client-ip', () => {
  it('cf-connecting-ipが存在する場合、それを返すこと', async () => {
    (headers as Mock).mockResolvedValue(new Map([['cf-connecting-ip', '1.2.3.4']]));
    const ip = await getClientIp();
    expect(ip).toBe('1.2.3.4');
  });

  it('偽装可能なx-real-ip・x-forwarded-forは無視して127.0.0.1にフォールバックすること', async () => {
    (headers as Mock).mockResolvedValue(
      new Map([
        ['x-real-ip', '1.2.3.4'],
        ['x-forwarded-for', '5.6.7.8, 9.10.11.12'],
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
