import { db } from '@/shared/db';
import { users } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';
import type { Account, Profile, User } from 'next-auth';
import { z } from 'zod';

const avatarProfile = z.object({
  id: z.string().regex(/^\d+$/),
  avatar: z.string().nullable(),
  discriminator: z.string().regex(/^\d+$/),
});

/** Discordの画像URLを返す。画像未設定なら、新旧のユーザー名方式に対応する既定画像を使う。 */
export function getDiscordAvatarUrl(profile: z.infer<typeof avatarProfile>): string {
  if (profile.avatar !== null) {
    const format = profile.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`;
  }
  const index =
    profile.discriminator === '0' ? Number(BigInt(profile.id) >> BigInt(22)) % 6 : Number(profile.discriminator) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

/** Discordログイン成功時に画像だけを同期する。表示名・権限は保持し、不完全なプロフィールは無視する。 */
export async function syncDiscordProfile({
  user,
  account,
  profile,
}: {
  user: Pick<User, 'id' | 'image'>;
  account?: Pick<Account, 'provider'> | null;
  profile?: Profile;
}): Promise<void> {
  if (account?.provider !== 'discord' || !user.id) return;
  const parsed = avatarProfile.safeParse(profile);
  if (!parsed.success) return;
  const image = getDiscordAvatarUrl(parsed.data);
  if (image !== user.image) await db.update(users).set({ image }).where(eq(users.id, user.id));
}
