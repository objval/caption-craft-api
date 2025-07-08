import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: (process.env.REDIS_PORT && parseInt(process.env.REDIS_PORT)) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: (process.env.REDIS_DB && parseInt(process.env.REDIS_DB)) || 0,
  maxRetriesPerRequest:
    (process.env.REDIS_MAX_RETRIES &&
      parseInt(process.env.REDIS_MAX_RETRIES)) ||
    3,
  retryDelayOnFailover:
    (process.env.REDIS_RETRY_DELAY &&
      parseInt(process.env.REDIS_RETRY_DELAY)) ||
    100,
  enableOfflineQueue: process.env.REDIS_ENABLE_OFFLINE_QUEUE !== 'false',
}));
