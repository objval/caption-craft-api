import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';

interface JobCache {
  data: any;
  timestamp: number;
  attempts: number;
}

@Injectable()
export class JobCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobCacheService.name);
  private readonly jobCache = new Map<string, JobCache>();
  private readonly maxCacheTime = 5 * 60 * 1000; // 5 minutes
  private readonly maxAttempts = 3;
  private cleanupInterval: NodeJS.Timeout;

  onModuleInit() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  // Cache job before adding to Redis queue
  async addJobWithCache(
    queue: Queue,
    jobName: string, 
    jobData: any,
    options: any = {}
  ): Promise<any> {
    const jobId = this.generateJobId(jobName, jobData);
    
    // Check if job is already cached and recent
    const cachedJob = this.jobCache.get(jobId);
    if (cachedJob && this.isJobValid(cachedJob)) {
      this.logger.debug(`Job ${jobId} found in cache, skipping Redis add`);
      return { id: jobId, cached: true };
    }

    // Add to cache first
    this.jobCache.set(jobId, {
      data: jobData,
      timestamp: Date.now(),
      attempts: 0,
    });

    // Batch job additions to reduce Redis calls
    return this.deferredAddToQueue(queue, jobName, jobData, options);
  }

  // Batch multiple jobs to reduce Redis commands
  private jobBatch: Array<{
    queue: Queue;
    jobName: string;
    jobData: any;
    options: any;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];

  private deferredAddToQueue(queue: Queue, jobName: string, jobData: any, options: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.jobBatch.push({ queue, jobName, jobData, options, resolve, reject });
      
      // Process batch after a short delay to collect multiple jobs
      if (this.jobBatch.length === 1) {
        setTimeout(() => this.processBatch(), 1000); // 1 second batching window
      }
    });
  }

  private async processBatch(): Promise<void> {
    if (this.jobBatch.length === 0) return;

    const batch = [...this.jobBatch];
    this.jobBatch.length = 0;

    this.logger.debug(`Processing job batch of ${batch.length} jobs`);

    // Group jobs by queue to optimize Redis operations
    const queueGroups = new Map<Queue, typeof batch>();
    for (const job of batch) {
      if (!queueGroups.has(job.queue)) {
        queueGroups.set(job.queue, []);
      }
      queueGroups.get(job.queue)!.push(job);
    }

    // Process each queue group
    for (const [queue, jobs] of queueGroups) {
      try {
        // Add all jobs for this queue in a single operation when possible
        const results = await Promise.all(
          jobs.map(job => queue.add(job.jobName, job.jobData, {
            ...job.options,
            removeOnComplete: 1, // Aggressive cleanup
            removeOnFail: 1,
          }))
        );

        jobs.forEach((job, index) => {
          job.resolve(results[index]);
        });
      } catch (error) {
        jobs.forEach(job => {
          job.reject(error);
        });
      }
    }
  }

  // Check if cached job is still valid
  private isJobValid(cachedJob: JobCache): boolean {
    const now = Date.now();
    const isRecent = (now - cachedJob.timestamp) < this.maxCacheTime;
    const hasAttemptsLeft = cachedJob.attempts < this.maxAttempts;
    
    return isRecent && hasAttemptsLeft;
  }

  // Generate unique job ID based on content
  private generateJobId(jobName: string, jobData: any): string {
    const content = JSON.stringify({ jobName, ...jobData });
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `job_${Math.abs(hash)}`;
  }

  // Mark job as attempted
  markJobAttempted(jobId: string): void {
    const cachedJob = this.jobCache.get(jobId);
    if (cachedJob) {
      cachedJob.attempts++;
      if (cachedJob.attempts >= this.maxAttempts) {
        this.jobCache.delete(jobId);
        this.logger.debug(`Job ${jobId} removed from cache after max attempts`);
      }
    }
  }

  // Clean up expired cache entries
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [jobId, cachedJob] of this.jobCache.entries()) {
      if (!this.isJobValid(cachedJob)) {
        this.jobCache.delete(jobId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired job cache entries`);
    }
  }

  // Get cache statistics
  getStats() {
    return {
      cacheSize: this.jobCache.size,
      batchSize: this.jobBatch.length,
    };
  }
}
