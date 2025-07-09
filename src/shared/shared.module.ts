import { Module } from '@nestjs/common';
import { CloudinaryService } from './services/cloudinary.service';
import { OpenaiService } from './services/openai.service';
import { FfmpegService } from './services/ffmpeg.service';
import { RedisConnectionPool } from './services/redis-pool.service';
import { JobCacheService } from './services/job-cache.service';
import { LazyQueueManager } from './services/lazy-queue.service';
import { RedisStatsService } from './services/redis-stats.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [
    CloudinaryService, 
    OpenaiService, 
    FfmpegService,
    RedisConnectionPool,
    JobCacheService,
    LazyQueueManager,
    RedisStatsService,
  ],
  exports: [
    CloudinaryService, 
    OpenaiService, 
    FfmpegService,
    RedisConnectionPool,
    JobCacheService,
    LazyQueueManager,
    RedisStatsService,
  ],
})
export class SharedModule {}
