import { Injectable, Logger } from '@nestjs/common';
import { RedisConnectionPool } from './redis-pool.service';
import { JobCacheService } from './job-cache.service';
import { LazyQueueManager } from './lazy-queue.service';

@Injectable()
export class RedisStatsService {
  private readonly logger = new Logger(RedisStatsService.name);

  constructor(
    private readonly redisPool: RedisConnectionPool,
    private readonly jobCache: JobCacheService,
    private readonly lazyQueueManager: LazyQueueManager,
  ) {}

  // Get comprehensive Redis optimization statistics
  getOptimizationStats() {
    const poolStats = this.redisPool.getStats();
    const cacheStats = this.jobCache.getStats();
    const queueStats = this.lazyQueueManager.getStats();

    const stats = {
      connectionPool: poolStats,
      jobCache: cacheStats,
      lazyQueues: queueStats,
      timestamp: new Date().toISOString(),
    };

    this.logger.log('Redis optimization stats:', JSON.stringify(stats, null, 2));
    return stats;
  }

  // Log stats periodically
  startMonitoring(intervalMs = 5 * 60 * 1000) { // 5 minutes
    setInterval(() => {
      this.getOptimizationStats();
    }, intervalMs);
  }
}
