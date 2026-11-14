import { db } from '@/shared/db';
import { users } from '@/shared/db/schema';
import { firstRow } from '@/shared/utils/first-row';
import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { getDiscordAvatarUrl, syncDiscordProfile } from './discord-profile';

const profile = { id: '175928847299117063', avatar: 'new-avatar', discriminator: '0' };
let userId: string | undefined;

afterEach(async () => {
  if (userId) await db.delete(users).where(eq(users.id, userId));
});

describe('Discordのプロフィール画像', () => {
  it.each([
    ['new-avatar', '0', 'https://cdn.discordapp.com/avatars/175928847299117063/new-avatar.png'],
    ['a_animated', '0', 'https://cdn.discordapp.com/avatars/175928847299117063/a_animated.gif'],
    [null, '0', 'https://cdn.discordapp.com/embed/avatars/2.png'],
    [null, '1234', 'https://cdn.discordapp.com/embed/avatars/4.png'],
  ] as const)('画像 %s・discriminator %s のURLを求める', (avatar, discriminator, expected) => {
    expect(getDiscordAvatarUrl({ ...profile, avatar, discriminator })).toBe(expected);
  });

  it('Discordログインで画像だけを更新し、ゲストログインでは変更しない', async () => {
    const user = firstRow(
      await db
        .insert(users)
        .values({ name: '自分で設定した名前', role: 'ADMIN', image: 'https://example.test/old.png' })
        .returning(),
      '画像同期テスト利用者'
    );
    userId = user.id;

    await syncDiscordProfile({ user, account: { provider: 'credentials' }, profile });
    expect((await db.query.users.findFirst({ where: eq(users.id, user.id) }))?.image).toBe(
      'https://example.test/old.png'
    );

    await syncDiscordProfile({ user, account: { provider: 'discord' }, profile });
    expect(await db.query.users.findFirst({ where: eq(users.id, user.id) })).toMatchObject({
      image: 'https://cdn.discordapp.com/avatars/175928847299117063/new-avatar.png',
      name: '自分で設定した名前',
      role: 'ADMIN',
    });

    await syncDiscordProfile({ user, account: { provider: 'discord' }, profile: { ...profile, avatar: null } });
    expect((await db.query.users.findFirst({ where: eq(users.id, user.id) }))?.image).toBe(
      'https://cdn.discordapp.com/embed/avatars/2.png'
    );
  });
});
