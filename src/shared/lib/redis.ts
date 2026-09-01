import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

declare global {
  // 開発時のホットリロードをまたいで redis 接続を再利用するためのキャッシュ

  var __redisConn: Redis | undefined;
}

// 接続イベントの購読は生成時に1回だけ行う。再利用インスタンスへ再登録するとリスナーが重複する
function createRedis() {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
  });

  client.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  client.on('connect', () => {
    console.log('Redis connected');
  });

  return client;
}

export const redis = globalThis.__redisConn ?? createRedis();

if (process.env.NODE_ENV !== 'production') globalThis.__redisConn = redis;
