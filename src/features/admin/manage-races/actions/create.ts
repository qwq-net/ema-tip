'use server';

import { db } from '@/shared/db';
import { raceInstances } from '@/shared/db/schema';
import { ADMIN_ERRORS, requireAdmin } from '@/shared/utils/admin';
import { parseJSTToUTC } from '@/shared/utils/date';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { raceSchema } from '../model/validation';

export async function createRace(formData: FormData) {
  await requireAdmin();

  const conditionValue = formData.get('condition');
  const closingAtValue = formData.get('closingAt');

  const parse = raceSchema.safeParse({
    eventId: formData.get('eventId'),
    date: formData.get('date'),
    venueId: formData.get('venueId'),
    raceDefinitionId: formData.get('raceDefinitionId') || undefined,
    direction: formData.get('direction') || undefined,
    name: formData.get('name'),
    raceNumber: formData.get('raceNumber') || undefined,
    distance: formData.get('distance'),
    surface: formData.get('surface'),
    condition: conditionValue && conditionValue !== '' ? conditionValue : undefined,
    closingAt: closingAtValue && closingAtValue !== '' ? closingAtValue : undefined,
  });

  if (!parse.success) {
    console.error('Validation Error Details:', parse.error.format());
    throw new Error(ADMIN_ERRORS.INVALID_INPUT);
  }

  let raceNumber = parse.data.raceNumber;
  if (!raceNumber) {
    const existingRaces = await db.query.raceInstances.findMany({
      where: eq(raceInstances.eventId, parse.data.eventId),
      columns: { raceNumber: true },
    });
    const maxNumber = existingRaces.reduce((max, race) => Math.max(max, race.raceNumber || 0), 0);
    raceNumber = maxNumber + 1;
  }

  const venueId = parse.data.venueId;
  const eventId = parse.data.eventId;

  const guaranteedOddsMaster = await db.query.guaranteedOddsMaster.findMany();

  const defaultGuaranteedOdds = guaranteedOddsMaster.reduce<Record<string, number>>((acc, item) => {
    acc[item.key] = Number(item.odds);
    return acc;
  }, {});

  await db.insert(raceInstances).values({
    eventId,
    date: parse.data.date,
    venueId,

    raceDefinitionId: parse.data.raceDefinitionId || null,
    name: parse.data.name,
    raceNumber,
    distance: parse.data.distance,
    surface: parse.data.surface,
    condition: parse.data.condition || null,
    direction: parse.data.direction,
    closingAt: parse.data.closingAt ? parseJSTToUTC(parse.data.closingAt) : null,
    status: 'SCHEDULED',
    guaranteedOdds: defaultGuaranteedOdds,
  });

  revalidatePath('/admin/races');
}
