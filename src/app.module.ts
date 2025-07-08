import { Module } from '@nestjs/common';
import { AuthModule } from './core/auth/auth.module';
import { DatabaseModule } from './core/database/database.module';
import { CreditsModule } from './modules/credits/credits.module';
import { VideosModule } from './modules/videos/videos.module';
import { QueuesModule } from './modules/queues/queues.module';
import { TranscriptsModule } from './modules/transcripts/transcripts.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CustomConfigModule } from './core/config/config.module';

@Module({
  imports: [
    CustomConfigModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute
      },
    ]),
    AuthModule,
    DatabaseModule,
    CreditsModule,
    VideosModule,
    QueuesModule,
    TranscriptsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
