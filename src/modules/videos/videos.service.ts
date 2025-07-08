import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as fs from 'fs';
import { promisify } from 'util';
import { Video } from '../../shared/types';
import { VideosRepository } from './repositories/videos.repository';
import { CreateVideoDto } from './dto/video.dto';

const unlinkAsync = promisify(fs.unlink);

@Injectable()
export class VideosService {
  constructor(
    private readonly videosRepository: VideosRepository,
    @InjectQueue('transcription-queue') private transcriptionQueue: Queue,
    @InjectQueue('burn-in-queue') private burnInQueue: Queue,
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

    await this.transcriptionQueue.add(
      'transcribe',
      { videoId: video.id, filePath },
      { removeOnComplete: true, removeOnFail: false },
    );

    return video;
  }

  async findAll(userId: string): Promise<Video[]> {
    return this.videosRepository.findAll(userId);
  }

  async findOne(id: string, userId: string): Promise<Video> {
    return this.videosRepository.findOne(id, userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    return this.videosRepository.delete(id, userId);
  }

  async addBurnInJob(videoId: string): Promise<void> {
    await this.burnInQueue.add(
      'burn-in',
      { videoId },
      { removeOnComplete: true, removeOnFail: false },
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
      await this.transcriptionQueue.add(
        'transcribe',
        { videoId: video.id }, // No filePath needed, processor will download from Cloudinary
        { removeOnComplete: true, removeOnFail: false },
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

  async deleteTempFile(filePath: string): Promise<void> {
    try {
      await unlinkAsync(filePath);
    } catch (error) {
      console.error(`Failed to delete temporary file ${filePath}:`, error);
    }
  }
}
