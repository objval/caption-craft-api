import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { CloudinaryService } from '../../shared/services/cloudinary.service';
import { OpenaiService } from '../../shared/services/openai.service';
import { FfmpegService } from '../../shared/services/ffmpeg.service';
import { DatabaseService } from '../../core/database/database.service';
import * as path from 'path';

@Processor('transcription-queue', { concurrency: 1 })
export class TranscriptionProcessor extends WorkerHost {
  private readonly logger = new Logger(TranscriptionProcessor.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly openaiService: OpenaiService,
    private readonly ffmpegService: FfmpegService,
    private readonly databaseService: DatabaseService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `Processing job ${job.id} of type ${job.name} with data: ${JSON.stringify(job.data)}`,
    );

    const { videoId } = job.data;
    let { filePath } = job.data;
    const supabase = this.databaseService.getClient(); // Get client here

    // If filePath is not provided, it's a retry. Download from Cloudinary.
    if (!filePath) {
      this.logger.log(
        `Retrying job for videoId: ${videoId}. Downloading from Cloudinary.`,
      );
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('original_video_cloudinary_id')
        .eq('id', videoId)
        .single();

      if (videoError || !videoData?.original_video_cloudinary_id) {
        throw new Error(
          `Could not find original video in Cloudinary for videoId: ${videoId}`,
        );
      }

      const videoUrl = this.cloudinaryService.generateVideoUrl(
        videoData.original_video_cloudinary_id,
      );
      filePath = await this.ffmpegService.downloadFromUrl(videoUrl, videoId);
    }

    const audioPath = path.join(path.dirname(filePath), `${videoId}.mp3`);

    try {
      // 1. Upload original video to Cloudinary.
      const cloudinaryResult = await this.cloudinaryService.uploadVideo(
        filePath,
        videoId,
      );
      const thumbnailUrl =
        await this.cloudinaryService.generateThumbnail(videoId);

      await supabase
        .from('videos')
        .update({
          original_video_cloudinary_id: cloudinaryResult.public_id,
          thumbnail_url: thumbnailUrl,
          status: 'processing',
        })
        .eq('id', videoId);

      // 2. Extract audio with FFmpeg.
      await this.ffmpegService.extractAudio(filePath, audioPath);

      // 3. Call OpenAI Whisper API.
      const transcription = await this.openaiService.transcribeAudio(audioPath);

      // 4. Save transcript and update video status in the database.
      await supabase.from('transcripts').insert({
        video_id: videoId,
        transcript_data: transcription,
      });

      await supabase
        .from('videos')
        .update({ status: 'ready' })
        .eq('id', videoId);

      this.logger.log(`Job ${job.id} completed.`);
      return { status: 'completed', videoId };
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
      await supabase
        .from('videos')
        .update({ status: 'failed', job_error_message: error.message })
        .eq('id', videoId);
      throw error; // Re-throw to mark job as failed in BullMQ
    } finally {
      // 5. Clean up temporary files.
      await this.ffmpegService.cleanupFile(filePath);
      await this.ffmpegService.cleanupFile(audioPath);
    }
  }
}
