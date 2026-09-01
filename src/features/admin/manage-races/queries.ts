import { db } from '@/shared/db';

export async function getAdminRaceGroups() {
  const eventsData = await db.query.events.findMany({
    orderBy: (events, { desc }) => [desc(events.date), desc(events.createdAt)],
    with: {
      bet5Event: {
        columns: {
          id: true,
          status: true,
        },
        with: {
          race1: {
            columns: {
              status: true,
            },
          },
          race2: {
            columns: {
              status: true,
            },
          },
          race3: {
            columns: {
              status: true,
            },
          },
          race4: {
            columns: {
              status: true,
            },
          },
          race5: {
            columns: {
              status: true,
            },
          },
        },
      },
      races: {
        with: {
          venue: true,
          // UIは着順入力済みかの判定にしか使わないため、entries はそのカラムだけ返す
          entries: { columns: { finishPosition: true } },
        },
        orderBy: (raceInstances, { asc }) => [asc(raceInstances.raceNumber), asc(raceInstances.name)],
      },
    },
  });

  return eventsData.map((event) => ({
    id: event.id,
    name: event.name,
    date: event.date,
    status: event.status,
    bet5Event: event.bet5Event,
    races: event.races,
  }));
}
