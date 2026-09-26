import { db } from '@/shared/db';
import { events, wallets } from '@/shared/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';

export async function getEventsWithJoinStatus(userId: string) {
  const availableEvents = await db.query.events.findMany({
    where: inArray(events.status, ['ACTIVE', 'COMPLETED']),
    orderBy: [desc(events.date), desc(events.createdAt)],
  });

  const userWallets = await db.query.wallets.findMany({
    where: eq(wallets.userId, userId),
  });
  const joinedEventIds = new Set(userWallets.map((w) => w.eventId));

  return availableEvents.map((event) => ({
    ...event,
    isJoined: joinedEventIds.has(event.id),
  }));
}
