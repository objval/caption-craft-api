import { Module } from '@nestjs/common';
import { CloudinaryService } from './services/cloudinary.service';
import { OpenaiService } from './services/openai.service';
import { FfmpegService } from './services/ffmpeg.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [CloudinaryService, OpenaiService, FfmpegService],
  exports: [CloudinaryService, OpenaiService, FfmpegService],
})
export class SharedModule {}
