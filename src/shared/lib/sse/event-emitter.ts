import { EventEmitter } from 'events';

class RaceEventEmitter extends EventEmitter {
  public id = Math.random().toString(36).substring(7);
}

const globalForEvents = global as unknown as { raceEventEmitter: RaceEventEmitter };

export const raceEventEmitter = globalForEvents.raceEventEmitter ?? new RaceEventEmitter();
globalForEvents.raceEventEmitter = raceEventEmitter;

export const RACE_EVENTS = {
  RACE_FINALIZED: 'RACE_FINALIZED',
  RACE_BROADCAST: 'RACE_BROADCAST',
  RACE_CLOSED: 'RACE_CLOSED',
  RACE_REOPENED: 'RACE_REOPENED',
  RACE_ODDS_UPDATED: 'RACE_ODDS_UPDATED',
  RANKING_UPDATED: 'RANKING_UPDATED',
  RACE_RESULT_UPDATED: 'RACE_RESULT_UPDATED',
} as const;
