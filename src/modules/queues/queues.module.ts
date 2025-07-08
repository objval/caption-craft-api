import { Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TranscriptionProcessor } from './transcription.processor';
import { SharedModule } from '../../shared/shared.module';
import { DatabaseModule } from '../../core/database/database.module';
import { BurnInProcessor } from './burn-in.processor';
import { CleanupProcessor } from './cleanup.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (!redisUrl) {
          throw new Error('REDIS_URL is not defined in environment variables.');
        }
        const url = new URL(redisUrl);
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port, 10),
            password: url.password,
            tls: url.protocol === 'rediss:' ? {} : undefined, // Enable TLS for rediss
            // Custom retry strategy with exponential backoff
            retryStrategy: (times: number) => {
              const logger = new Logger('BullMQ');
              const delay = Math.min(times * 500, 10000); // Exponential backoff
              logger.warn(
                `[QueueModule] Redis connection failed. Retrying in ${delay}ms... (Attempt #${times})`,
              );
              return delay;
            },
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'transcription-queue' },
      { name: 'burn-in-queue' },
      { name: 'cleanup-queue' }, // Register new cleanup queue
    ),
    SharedModule,
    DatabaseModule,
  ],
  providers: [TranscriptionProcessor, BurnInProcessor, CleanupProcessor],
  exports: [BullModule],
})
export class QueuesModule {}
