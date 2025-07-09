import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LazyQueueManager implements OnModuleDestroy {
  private readonly logger = new Logger(LazyQueueManager.name);
  private readonly queues = new Map<string, Queue>();
  private readonly queueLastUsed = new Map<string, number>();
  private readonly queueIdleTimeout = 10 * 60 * 1000; // 10 minutes
  private cleanupInterval: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    // Start cleanup interval to destroy idle queues
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleQueues();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  // Get or create queue on demand
  getQueue(queueName: string): Queue {
    // Update last used timestamp
    this.queueLastUsed.set(queueName, Date.now());

    // Return existing queue if available
    if (this.queues.has(queueName)) {
      this.logger.debug(`Reusing existing queue: ${queueName}`);
      return this.queues.get(queueName)!;
    }

    // Create new queue with aggressive optimization
    this.logger.log(`Creating new lazy queue: ${queueName}`);
    const queue = this.createOptimizedQueue(queueName);
    this.queues.set(queueName, queue);
    
    return queue;
  }

  private createOptimizedQueue(queueName: string): Queue {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      throw new Error('REDIS_URL is not defined');
    }

    const url = new URL(redisUrl);
    
    return new Queue(queueName, {
      connection: {
        host: url.hostname,
        port: parseInt(url.port, 10),
        password: url.password,
        tls: url.protocol === 'rediss:' ? {} : undefined,
        
        // Shared connection settings for minimal overhead
        lazyConnect: true,
        maxRetriesPerRequest: null,
        commandTimeout: 30000,
        enableOfflineQueue: false,
        
        // Reduce connection health checks
        enableReadyCheck: false,
      },
      
      // Ultra-aggressive job settings
      defaultJobOptions: {
        removeOnComplete: 1, // Keep only 1 completed job
        removeOnFail: 1, // Keep only 1 failed job
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 15000, // 15 second delay
        },
        // Remove job data immediately after processing
        delay: 0,
      },
    });
  }

  // Clean up idle queues to free resources
  private async cleanupIdleQueues(): Promise<void> {
    const now = Date.now();
    const idleQueues: string[] = [];

    for (const [queueName, lastUsed] of this.queueLastUsed.entries()) {
      if (now - lastUsed > this.queueIdleTimeout) {
        idleQueues.push(queueName);
      }
    }

    for (const queueName of idleQueues) {
      await this.destroyQueue(queueName);
    }

    if (idleQueues.length > 0) {
      this.logger.log(`Cleaned up ${idleQueues.length} idle queues: ${idleQueues.join(', ')}`);
    }
  }

  // Destroy a specific queue
  private async destroyQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      try {
        await queue.close();
        this.queues.delete(queueName);
        this.queueLastUsed.delete(queueName);
        this.logger.debug(`Destroyed idle queue: ${queueName}`);
      } catch (error) {
        this.logger.error(`Error destroying queue ${queueName}:`, error);
      }
    }
  }

  // Get queue statistics
  getStats() {
    return {
      activeQueues: this.queues.size,
      queueNames: Array.from(this.queues.keys()),
      lastUsedTimes: Object.fromEntries(this.queueLastUsed),
    };
  }

  // Cleanup on module destroy
  async onModuleDestroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all queues
    const closePromises = Array.from(this.queues.values()).map(queue => 
      queue.close().catch(err => 
        this.logger.error('Error closing queue:', err)
      )
    );

    await Promise.all(closePromises);
    this.queues.clear();
    this.queueLastUsed.clear();
    
    this.logger.log('All queues closed');
  }
}
