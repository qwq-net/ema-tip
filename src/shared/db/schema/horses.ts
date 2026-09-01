import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { HORSE_SOURCES, HORSE_TAG_TYPES, HORSE_TYPES } from '../../constants/horse';

export const horseTypeEnum = pgEnum('horse_type', HORSE_TYPES);
export const horseSourceEnum = pgEnum('horse_source', HORSE_SOURCES);
export const horseTagTypeEnum = pgEnum('horse_tag_type', HORSE_TAG_TYPES);
export const horseGenderEnum = pgEnum('horse_gender', ['MARE', 'FILLY', 'HORSE', 'COLT', 'GELDING']);
export const horseOriginEnum = pgEnum('horse_origin', ['DOMESTIC', 'FOREIGN_BRED', 'FOREIGN_TRAINED']);

export const horses = pgTable('horse', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  gender: horseGenderEnum('gender').notNull(),
  age: integer('age'),
  type: horseTypeEnum('type').default('REAL').notNull(),
  origin: horseOriginEnum('origin').default('DOMESTIC').notNull(),
  source: horseSourceEnum('source').default('MANUAL').notNull(),
  notes: text('notes'),
  sireId: uuid('sire_id'),
  damId: uuid('dam_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const horseTags = pgTable(
  'horse_tag',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    horseId: uuid('horse_id')
      .notNull()
      .references(() => horses.id, { onDelete: 'cascade' }),
    type: horseTagTypeEnum('type').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // タグは horseId で引く。馬削除時のカスケードもこの索引を使う
    horseIdx: index('horse_tag_horse_idx').on(table.horseId),
  })
);

export const horseTagMaster = pgTable('horse_tag_master', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: horseTagTypeEnum('type').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
