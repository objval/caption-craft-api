import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { CloudinaryService } from '../../shared/services/cloudinary.service';
import { FfmpegService } from '../../shared/services/ffmpeg.service';
import { DatabaseService } from '../../core/database/database.service';
import * as path from 'path';
import * as os from 'os';

@Processor('burn-in-queue', { concurrency: 1 })
export class BurnInProcessor extends WorkerHost {
  private readonly logger = new Logger(BurnInProcessor.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
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
    let videoRecord: any;
    let transcriptRecord: any;
    let tempSrtPath: string | null = null;
    let tempBurnedVideoPath: string | null = null;
    const supabase = this.databaseService.getClient(); // Get client here

    try {
      // 1. Fetch video and transcript data, including active_transcript_type
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('original_video_cloudinary_id, active_transcript_type')
        .eq('id', videoId)
        .single();
      if (videoError) throw videoError;
      videoRecord = videoData;

      const { data: transcriptData, error: transcriptError } = await supabase
        .from('transcripts')
        .select('transcript_data, edited_transcript_data')
        .eq('video_id', videoId)
        .single();
      if (transcriptError) throw transcriptError;
      transcriptRecord = transcriptData;

      // Determine which transcript to use based on active_transcript_type
      const contentToUse =
        videoRecord.active_transcript_type === 'edited'
          ? transcriptRecord.edited_transcript_data
          : transcriptRecord.transcript_data;

      if (!contentToUse || !Array.isArray(contentToUse.segments)) {
        throw new Error(
          'Transcript data is missing or segments are not an array.',
        );
      }

      // 2. Generate subtitle file (.srt) from transcript data
      tempSrtPath = path.join(os.tmpdir(), `${videoId}.srt`);
      await this.ffmpegService.generateSrt(contentToUse, tempSrtPath);

      // 3. Burn subtitles onto the video
      const originalVideoUrl = this.cloudinaryService.generateVideoUrl(
        videoRecord.original_video_cloudinary_id,
      );
      tempBurnedVideoPath = path.join(os.tmpdir(), `${videoId}_burned.mp4`);
      await this.ffmpegService.burnSubtitles(
        originalVideoUrl,
        tempSrtPath,
        tempBurnedVideoPath,
      );

      // 4. Upload final burned video to Cloudinary
      const burnedVideoCloudinaryResult =
        await this.cloudinaryService.uploadVideo(
          tempBurnedVideoPath,
          `${videoId}_burned`,
        );

      // 5. Update video record in database
      await supabase
        .from('videos')
        .update({
          final_video_cloudinary_id: burnedVideoCloudinaryResult.public_id,
          status: 'complete',
        })
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
      // 6. Clean up temporary files
      if (tempSrtPath) await this.ffmpegService.cleanupFile(tempSrtPath);
      if (tempBurnedVideoPath)
        await this.ffmpegService.cleanupFile(tempBurnedVideoPath);
    }
  }
}
