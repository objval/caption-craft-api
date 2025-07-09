import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisConnectionPool {
  private readonly logger = new Logger(RedisConnectionPool.name);
  private static connectionPool: Redis | null = null;
  private static connectionCount = 0;

  constructor(private readonly configService: ConfigService) {}

  // Singleton pattern for shared Redis connection
  getConnection(): Redis {
    if (!RedisConnectionPool.connectionPool) {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      if (!redisUrl) {
        throw new Error('REDIS_URL is not defined');
      }

      const url = new URL(redisUrl);
      
      RedisConnectionPool.connectionPool = new Redis({
        host: url.hostname,
        port: parseInt(url.port, 10),
        password: url.password,
        tls: url.protocol === 'rediss:' ? {} : undefined,
        
        // Ultra-aggressive connection optimization
        lazyConnect: true,
        keepAlive: 120000, // 2 minutes keep alive
        connectTimeout: 30000, // 30 second connect timeout
        commandTimeout: 30000, // 30 second command timeout
        
        // Connection pooling settings
        maxRetriesPerRequest: null, // Required by BullMQ
        enableOfflineQueue: false,
        
        // Reduce ping frequency
        enableReadyCheck: false,
        
        // Connection retry strategy
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 2000, 60000);
          this.logger.warn(`Redis retry attempt ${times}, delay: ${delay}ms`);
          return delay;
        },
      });

      RedisConnectionPool.connectionPool.on('connect', () => {
        this.logger.log('Redis connection pool established');
      });

      RedisConnectionPool.connectionPool.on('error', (err) => {
        this.logger.error('Redis connection pool error:', err);
      });
    }

    RedisConnectionPool.connectionCount++;
    this.logger.debug(`Redis connection requested, total connections: ${RedisConnectionPool.connectionCount}`);
    
    return RedisConnectionPool.connectionPool;
  }

  // Get connection statistics
  getStats() {
    return {
      connectionCount: RedisConnectionPool.connectionCount,
      hasPool: !!RedisConnectionPool.connectionPool,
      poolStatus: RedisConnectionPool.connectionPool?.status || 'none',
    };
  }

  // Cleanup method (call on app shutdown)
  static async cleanup() {
    if (RedisConnectionPool.connectionPool) {
      await RedisConnectionPool.connectionPool.quit();
      RedisConnectionPool.connectionPool = null;
      RedisConnectionPool.connectionCount = 0;
    }
  }
}
