import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Get,
  Param,
  Delete,
  Patch,
  ParseEnumPipe,
  Body,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CreditGuard } from '../credits/guards/credits.guard';
import { UseCredits } from '../credits/decorators/use-credits.decorator';
import {
  GetUser,
  AuthenticatedUser,
} from '../../core/auth/decorators/get-user.decorator';
import { VideosService } from './videos.service';
import { Throttle } from '@nestjs/throttler';
import { Video } from '../../shared/types';
import {
  VideoUploadInterceptor,
  createVideoFileInterceptor,
} from './interceptors/video-upload.interceptor';
import { RATE_LIMIT_CONFIG } from '../../core/config/constants';

@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard, CreditGuard)
  @UseCredits(1)
  @Throttle({
    default: {
      limit: RATE_LIMIT_CONFIG.UPLOAD.LIMIT,
      ttl: RATE_LIMIT_CONFIG.UPLOAD.TTL,
    },
  })
  @UseInterceptors(createVideoFileInterceptor(), VideoUploadInterceptor)
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: AuthenticatedUser,
  ) {
    // At this point, the file is validated and saved to ./tmp and 1 credit is deducted.
    // Now, create a video record in the database and add a job to the queue.
    const videoTitle = file.originalname; // Or extract from request body
    const video = await this.videosService.create(
      user.id,
      videoTitle,
      file.path,
    );

    return { message: 'Video upload initiated', videoId: video.id };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@GetUser() user: AuthenticatedUser): Promise<Video[]> {
    return this.videosService.findAll(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<Video> {
    return this.videosService.findOne(id, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.videosService.delete(id, user.id);
  }

  @Post(':id/burn-in')
  @UseGuards(JwtAuthGuard, CreditGuard)
  @UseCredits(5) // Example: Burn-in costs more
  @Throttle({
    default: {
      limit: RATE_LIMIT_CONFIG.GLOBAL.LIMIT,
      ttl: RATE_LIMIT_CONFIG.GLOBAL.TTL,
    },
  })
  async burnInVideo(
    @Param('id') videoId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    // Verify the video belongs to the user
    await this.videosService.findOne(videoId, user.id);

    // Add job to burn-in queue
    await this.videosService.addBurnInJob(videoId);

    return { message: 'Burn-in process initiated.', videoId };
  }

  @Post(':id/retry')
  @UseGuards(JwtAuthGuard)
  async retry(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<Video> {
    return this.videosService.retry(id, user.id);
  }

  @Patch(':id/active-transcript-type')
  async updateActiveTranscriptType(
    @Param('id') videoId: string,
    @Body('type', new ParseEnumPipe(['original', 'edited']))
    type: 'original' | 'edited',
    @GetUser() user: AuthenticatedUser,
  ): Promise<{ message: string; video: Video }> {
    const updatedVideo = await this.videosService.updateActiveTranscriptType(
      videoId,
      user.id,
      type,
    );
    return {
      message: `Active transcript type updated to ${type}.`,
      video: updatedVideo,
    };
  }
}
