import { Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TranscriptionProcessor } from './transcription.processor';
import { SharedModule } from '../../shared/shared.module';
import { DatabaseModule } from '../../core/database/database.module';
import { BurnInProcessor } from './burn-in.processor';
import { CleanupProcessor } from './cleanup.processor';
import { RedisConnectionPool } from '../../shared/services/redis-pool.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule, SharedModule],
      useFactory: (configService: ConfigService, redisPool: RedisConnectionPool) => {
        const logger = new Logger('BullMQ');
        logger.log('Using shared Redis connection pool for BullMQ');
        
        // Use shared connection from pool
        const sharedConnection = redisPool.getConnection();
        
        return {
          connection: sharedConnection,
          // Ultra-aggressive queue settings to minimize Redis commands
          defaultJobOptions: {
            removeOnComplete: 1, // Keep only 1 completed job (reduced from 10)
            removeOnFail: 1, // Keep only 1 failed job (reduced from 5)
            attempts: 2, // Reduced retry attempts
            delay: 0, // No artificial delay
            backoff: {
              type: 'exponential',
              delay: 10000, // 10 second initial delay
            },
          },
        };
      },
      inject: [ConfigService, RedisConnectionPool],
    }),
    BullModule.registerQueue(
      { 
        name: 'transcription-queue',
        // Queue-specific job options
        defaultJobOptions: {
          removeOnComplete: 5,
          removeOnFail: 3,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 10000, // 10 second delay for transcription retries
          },
        },
      },
      { 
        name: 'burn-in-queue',
        defaultJobOptions: {
          removeOnComplete: 5,
          removeOnFail: 3,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 8000, // 8 second delay for burn-in retries
          },
        },
      },
      { 
        name: 'cleanup-queue',
        defaultJobOptions: {
          removeOnComplete: 3,
          removeOnFail: 2,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000, // 5 second delay for cleanup retries
          },
        },
      },
    ),
    SharedModule,
    DatabaseModule,
  ],
  providers: [TranscriptionProcessor, BurnInProcessor, CleanupProcessor],
  exports: [BullModule],
})
export class QueuesModule {}
