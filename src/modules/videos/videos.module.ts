import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { DatabaseModule } from '../../core/database/database.module';
import { CreditsModule } from '../credits/credits.module';
import { QueuesModule } from '../queues/queues.module';
import { VideoValidationService } from './services/video-validation.service';
import { VideoUploadInterceptor } from './interceptors/video-upload.interceptor';
import { VideosRepository } from './repositories/videos.repository';

@Module({
  imports: [DatabaseModule, CreditsModule, QueuesModule],
  controllers: [VideosController],
  providers: [
    VideosService,
    VideosRepository,
    VideoValidationService,
    VideoUploadInterceptor,
  ],
})
export class VideosModule {}
