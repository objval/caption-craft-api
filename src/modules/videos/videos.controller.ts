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
  BadRequestException,
  PayloadTooLargeException,
  Options,
  HttpCode,
  HttpStatus,
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
import { RedisStatsService } from '../../shared/services/redis-stats.service';
import { UpdateTranscriptDto } from './dto/video.dto';
import { TIKTOK_CAPTION_PRESETS } from '../../core/config/caption-styles';
import { TikTokStyleOptions } from '../../shared/services/ffmpeg.service';

@Controller('videos')
export class VideosController {
  constructor(
    private readonly videosService: VideosService,
    private readonly redisStatsService: RedisStatsService,
  ) {}

  @Options('upload')
  @HttpCode(HttpStatus.OK)
  uploadOptions() {
    return {
      message: 'CORS preflight response',
      allowedMethods: ['POST', 'OPTIONS'],
      maxFileSize: '500MB',
    };
  }

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
    // Validate file was uploaded
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Check file size (additional validation)
    const maxSizeInBytes = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSizeInBytes) {
      throw new PayloadTooLargeException(
        `File size exceeds limit of ${maxSizeInBytes / (1024 * 1024)}MB`
      );
    }

    // At this point, the file is validated and saved to ./tmp and 1 credit is deducted.
    // Now, create a video record in the database and add a job to the queue.
    const videoTitle = file.originalname; // Or extract from request body
    const video = await this.videosService.create(
      user.id,
      videoTitle,
      file.path,
    );

    return { 
      message: 'Video upload initiated', 
      videoId: video.id,
      fileSize: file.size,
      fileName: file.originalname
    };
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
  @UseGuards(JwtAuthGuard)
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

  @Patch(':id/transcript')
  @UseGuards(JwtAuthGuard)
  async updateTranscript(
    @Param('id') videoId: string,
    @Body() transcriptData: UpdateTranscriptDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<{ message: string; video: Video }> {
    const updatedVideo = await this.videosService.updateTranscript(
      videoId,
      user.id,
      transcriptData.transcript_data,
      transcriptData.version || 'edited',
    );
    return {
      message: 'Transcript updated successfully.',
      video: updatedVideo,
    };
  }

  @Get(':id/caption-style/presets')
  @UseGuards(JwtAuthGuard)
  async getCaptionStylePresets() {
    return {
      presets: TIKTOK_CAPTION_PRESETS,
      message: 'Available caption style presets',
    };
  }

  @Get(':id/caption-style')
  @UseGuards(JwtAuthGuard)
  async getCaptionStyle(
    @Param('id') videoId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    const video = await this.videosService.findOne(videoId, user.id);
    return {
      captionStyle: video.caption_style,
      message: 'Caption style retrieved successfully',
    };
  }

  @Patch(':id/caption-style')
  @UseGuards(JwtAuthGuard)
  async updateCaptionStyle(
    @Param('id') videoId: string,
    @Body() updateData: { captionStyle: TikTokStyleOptions },
    @GetUser() user: AuthenticatedUser,
  ) {
    const updatedVideo = await this.videosService.updateCaptionStyle(
      videoId,
      user.id,
      updateData.captionStyle,
    );
    return {
      video: updatedVideo,
      message: 'Caption style updated successfully',
    };
  }

  @Patch(':id/caption-style/preset/:presetName')
  @UseGuards(JwtAuthGuard)
  async applyCaptionStylePreset(
    @Param('id') videoId: string,
    @Param('presetName') presetName: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    const preset = TIKTOK_CAPTION_PRESETS[presetName];
    
    if (!preset) {
      throw new BadRequestException(`Preset "${presetName}" not found`);
    }

    const updatedVideo = await this.videosService.updateCaptionStyle(
      videoId,
      user.id,
      preset,
    );
    
    return {
      video: updatedVideo,
      appliedPreset: presetName,
      message: `Preset "${presetName}" applied successfully`,
    };
  }

  @Get('monitoring')
  async getMonitoringData() {
    const redisStats = this.redisStatsService.getOptimizationStats();
    return {
      message: 'Redis optimization stats retrieved',
      data: redisStats,
    };
  }
}
