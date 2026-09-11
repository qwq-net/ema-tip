import { db } from '@/shared/db';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveRoleForDiscordId } from './admin-discord-ids';

vi.mock('@/shared/db', () => ({
  db: { query: { adminDiscordIds: { findFirst: vi.fn() } } },
}));

describe('resolveRoleForDiscordId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('一覧に載っている Discord ID には ADMIN を返す', async () => {
    (db.query.adminDiscordIds.findFirst as unknown as Mock).mockResolvedValue({
      discordId: '988442447187165254',
      label: 'INTERNET',
    });

    await expect(resolveRoleForDiscordId('988442447187165254')).resolves.toBe('ADMIN');
  });

  it('一覧に無い Discord ID には USER を返す', async () => {
    (db.query.adminDiscordIds.findFirst as unknown as Mock).mockResolvedValue(undefined);

    await expect(resolveRoleForDiscordId('111111111111111111')).resolves.toBe('USER');
  });
});
