import type { ROLES } from '@/entities/user';
import type { forecasts } from '@/shared/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

export type Forecast = InferSelectModel<typeof forecasts>;

export type ForecastSelection = Record<string, string>;

export type ForecastWithUser = Forecast & {
  user: {
    id: string;
    name: string | null;
    image: string | null;
    role: (typeof ROLES)[keyof typeof ROLES];
  };
};
