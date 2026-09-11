import { ROLES, type Role } from '@/entities/user/constants';
import { db } from '@/shared/db';
import { adminDiscordIds } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Discord の固有 ID に与える役割を返す。一覧にあれば ADMIN、無ければ USER。
 * 使われ方: Discord の初回サインインで利用者レコードを作るときの役割決定に使う。
 * 2 回目以降のサインインは既存レコードの役割が優先されるため、後から一覧へ足しても昇格しない。
 */
export async function resolveRoleForDiscordId(discordId: string): Promise<Role> {
  const listed = await db.query.adminDiscordIds.findFirst({
    where: eq(adminDiscordIds.discordId, discordId),
    columns: { discordId: true },
  });

  return listed ? ROLES.ADMIN : ROLES.USER;
}
