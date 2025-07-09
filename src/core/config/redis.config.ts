import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: (process.env.REDIS_PORT && parseInt(process.env.REDIS_PORT)) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: (process.env.REDIS_DB && parseInt(process.env.REDIS_DB)) || 0,
  // BullMQ requires maxRetriesPerRequest to be null
  maxRetriesPerRequest: null,
  retryDelayOnFailover:
    (process.env.REDIS_RETRY_DELAY &&
      parseInt(process.env.REDIS_RETRY_DELAY)) ||
    100,
  enableOfflineQueue: process.env.REDIS_ENABLE_OFFLINE_QUEUE !== 'false',
  // BullMQ-specific settings to reduce Redis usage
  lazyConnect: true, // Don't connect until needed
  keepAlive: 30000, // Keep connections alive for 30 seconds
  maxMemoryPolicy: 'allkeys-lru', // Optimize memory usage
  // Connection pool settings
  connectTimeout: 10000,
  commandTimeout: 10000, // Increased timeout to avoid command timeouts
}));
