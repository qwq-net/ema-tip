import { getTableName, is, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { db } from './index';
import * as schema from './schema';

// スキーマの export から全テーブルを動的に導出する。
// 固定リストだとテーブル追加のたびに陳腐化し、FK を持たないテーブルが消え残る
async function main() {
  console.log('--- Resetting Database (Truncating all tables) ---');

  const tableNames = Object.values(schema)
    .filter((value) => is(value, PgTable))
    .map((table) => `"${getTableName(table)}"`);

  try {
    console.log(`Truncating ${tableNames.length} tables...`);
    await db.execute(sql.raw(`TRUNCATE TABLE ${tableNames.join(', ')} RESTART IDENTITY CASCADE`));
    console.log('--- Database Reset Completed ---');
  } catch (err) {
    console.error('Reset failed:', err);
    process.exit(1);
  }

  process.exit(0);
}

main();
