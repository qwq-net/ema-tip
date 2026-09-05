import { redis } from './redis';

async function main() {
  console.log('--- Clearing Redis Database ---');
  try {
    const result = await redis.flushdb();
    console.log(`Successfully cleared Redis database. Result: ${result}`);
  } finally {
    await redis.quit();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((cause: unknown) => {
    console.error('Failed to clear Redis:', cause);
    process.exit(1);
  });
