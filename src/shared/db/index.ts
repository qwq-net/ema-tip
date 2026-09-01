import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

declare global {
  // 開発時のホットリロードをまたいで postgres 接続を再利用するためのキャッシュ

  var __dbConn: postgres.Sql | undefined;
}

// PgBouncer 等を挟まない直結構成のため prepared statements は既定の有効のままにする
const conn = globalThis.__dbConn ?? postgres(connectionString, { max: 10 });

if (process.env.NODE_ENV !== 'production') globalThis.__dbConn = conn;

export const db = drizzle(conn, { schema });
