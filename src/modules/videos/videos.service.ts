import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as fs from 'fs';
import { promisify } from 'util';
import { Video } from '../../shared/types';
import { VideosRepository } from './repositories/videos.repository';
import { CreateVideoDto } from './dto/video.dto';
import { JobCacheService } from '../../shared/services/job-cache.service';
import { CloudinaryService } from '../../shared/services/cloudinary.service';

const unlinkAsync = promisify(fs.unlink);

@Injectable()
export class VideosService {
  constructor(
    private readonly videosRepository: VideosRepository,
    @InjectQueue('transcription-queue') private transcriptionQueue: Queue,
    @InjectQueue('burn-in-queue') private burnInQueue: Queue,
    private readonly jobCacheService: JobCacheService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    userId: string,
    title: string,
    filePath: string,
  ): Promise<Video> {
    const createVideoDto: CreateVideoDto = {
      userId,
      title,
      filePath,
    };

    const video = await this.videosRepository.create(createVideoDto);

    // Use job cache to batch and optimize job creation
    await this.jobCacheService.addJobWithCache(
      this.transcriptionQueue,
      'transcribe',
      { videoId: video.id, filePath },
      { removeOnComplete: 1, removeOnFail: 1 },
    );

    return video;
  }

  async findAll(userId: string): Promise<Video[]> {
    const videos = await this.videosRepository.findAll(userId);
    return videos.map(video => this.enrichVideoWithUrls(video));
  }

  async findOne(id: string, userId: string): Promise<Video> {
    const video = await this.videosRepository.findOne(id, userId);
    return this.enrichVideoWithUrls(video);
  }

  async delete(id: string, userId: string): Promise<void> {
    return this.videosRepository.delete(id, userId);
  }

  async addBurnInJob(videoId: string): Promise<void> {
    await this.jobCacheService.addJobWithCache(
      this.burnInQueue,
      'burn-in',
      { videoId },
      { removeOnComplete: 1, removeOnFail: 1 },
    );
  }

  async retry(id: string, userId: string): Promise<Video> {
    const video = await this.videosRepository.findOne(id, userId);

    if (video.status !== 'failed') {
      throw new InternalServerErrorException(
        'This video is not in a failed state and cannot be retried.',
      );
    }

    // Reset status and error message
    const updatedVideo = await this.videosRepository.updateStatus(
      id,
      'uploading',
      undefined,
    );

    // Determine which job to re-queue based on what failed
    if (video.original_video_cloudinary_id) {
      // If original video exists, it means transcription succeeded and burn-in failed
      await this.addBurnInJob(video.id);
    } else {
      // If no original video, it means transcription failed
      await this.jobCacheService.addJobWithCache(
        this.transcriptionQueue,
        'transcribe',
        { videoId: video.id }, // No filePath needed, processor will download from Cloudinary
        { removeOnComplete: 1, removeOnFail: 1 },
      );
    }

    return updatedVideo;
  }

  async updateActiveTranscriptType(
    videoId: string,
    userId: string,
    type: 'original' | 'edited',
  ): Promise<Video> {
    return this.videosRepository.updateActiveTranscriptType(
      videoId,
      userId,
      type,
    );
  }

  async updateTranscript(
    videoId: string,
    userId: string,
    transcriptData: any,
    version: 'original' | 'edited' = 'edited',
  ): Promise<Video> {
    return this.videosRepository.updateTranscript(
      videoId,
      userId,
      transcriptData,
      version,
    );
  }

  async updateCaptionStyle(
    videoId: string,
    userId: string,
    captionStyle: any,
  ): Promise<Video> {
    return this.videosRepository.updateCaptionStyle(
      videoId,
      userId,
      captionStyle,
    );
  }

  async deleteTempFile(filePath: string): Promise<void> {
    try {
      await unlinkAsync(filePath);
    } catch (error) {
      console.error(`Failed to delete temporary file ${filePath}:`, error);
    }
  }

  private enrichVideoWithUrls(video: Video): Video {
    const enrichedVideo = { ...video };
    
    // Add full URLs for original video
    if (video.original_video_cloudinary_id) {
      enrichedVideo.original_video_url = this.cloudinaryService.generateVideoUrl(video.original_video_cloudinary_id);
    }
    
    // Add full URLs for final video
    if (video.final_video_cloudinary_id) {
      enrichedVideo.final_video_url = this.cloudinaryService.generateVideoUrl(video.final_video_cloudinary_id);
      // Also add burned_video_url for backwards compatibility
      enrichedVideo.burned_video_url = enrichedVideo.final_video_url;
    }
    
    return enrichedVideo;
  }
}
