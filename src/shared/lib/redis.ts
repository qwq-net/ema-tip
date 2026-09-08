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
    // 生成時ではなく最初のコマンド発行時に接続する。
    // これがないと next build と単体テストが読み込みだけで接続を張り、Redis のない環境で ECONNREFUSED を吐く
    lazyConnect: true,
  });

  client.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  client.on('connect', () => {
    console.info('Redis connected');
  });

  return client;
}

export const redis = globalThis.__redisConn ?? createRedis();

if (process.env.NODE_ENV !== 'production') globalThis.__redisConn = redis;
