import { db } from '@/shared/db';
import { raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { beforeEach, expect, it, vi } from 'vitest';
import { upsertForecast } from './actions';

vi.mock('@/shared/config/auth', () => ({ auth: vi.fn().mockResolvedValue({ user: { id: 'forecaster-1' } }) }));
vi.mock('@/shared/utils/auth-helpers', () => ({ canManageForecasts: vi.fn().mockReturnValue(true) }));
vi.mock('@/shared/lib/sse/event-emitter', () => ({
  RACE_EVENTS: { FORECAST_UPDATED: 'FORECAST_UPDATED' },
  raceEventEmitter: { emit: vi.fn() },
}));
const save = vi.fn();
vi.mock('@/shared/db', () => ({
  db: { insert: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.insert).mockReturnValue({ values: () => ({ onConflictDoUpdate: save }) } as never);
  save.mockResolvedValue(undefined);
});

it('予想の保存が完了したら対象レースへ更新通知を送る', async () => {
  await upsertForecast('race-1', { horse1: '◎' }, '本命');
  expect(raceEventEmitter.emit).toHaveBeenCalledWith('FORECAST_UPDATED', expect.objectContaining({ raceId: 'race-1' }));
});

it('保存に失敗した予想は通知しない', async () => {
  save.mockRejectedValue(new Error('save failed'));
  await expect(upsertForecast('race-1', {}, '')).rejects.toThrow('save failed');
  expect(raceEventEmitter.emit).not.toHaveBeenCalled();
});
