import { BET_TYPE_ORDER } from '@/entities/bet/constants';
import { pgEnum } from 'drizzle-orm/pg-core';

// bets と races の双方から参照されるため、循環importを避けて独立ファイルに置く
export const betTypeEnum = pgEnum('bet_type', BET_TYPE_ORDER);
