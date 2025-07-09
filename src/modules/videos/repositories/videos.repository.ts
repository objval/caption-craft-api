import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { Video } from '../../../shared/types';
import { CreateVideoDto, UpdateVideoDto } from '../dto/video.dto';
import { PostgrestError } from '@supabase/supabase-js';

@Injectable()
export class VideosRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createVideoDto: CreateVideoDto): Promise<Video> {
    const supabase = this.databaseService.getClient();
    const {
      data,
      error,
    }: { data: Video | null; error: PostgrestError | null } = await supabase
      .from('videos')
      .insert({
        user_id: createVideoDto.userId,
        title: createVideoDto.title,
        status: 'uploading',
      })
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException('Failed to create video record.');
    }

    return data!;
  }

  async findAll(userId: string): Promise<Video[]> {
    const supabase = this.databaseService.getClient();
    const {
      data,
      error,
    }: { data: Video[] | null; error: PostgrestError | null } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw new InternalServerErrorException('Failed to fetch videos.');
    }

    return data || [];
  }

  async findOne(id: string, userId: string): Promise<Video> {
    const supabase = this.databaseService.getClient();
    const {
      data,
      error,
    }: { data: Video | null; error: PostgrestError | null } = await supabase
      .from('videos')
      .select('*, transcripts(*), active_transcript_type')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Supabase findOne error:', error);
      throw new InternalServerErrorException('Failed to fetch video.');
    }

    if (!data) {
      throw new NotFoundException('Video not found.');
    }

    return data;
  }

  async update(
    id: string,
    userId: string,
    updateVideoDto: UpdateVideoDto,
  ): Promise<Video> {
    const supabase = this.databaseService.getClient();
    const {
      data,
      error,
    }: { data: Video | null; error: PostgrestError | null } = await supabase
      .from('videos')
      .update(updateVideoDto)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException('Failed to update video.');
    }

    if (!data) {
      throw new NotFoundException('Video not found.');
    }

    return data;
  }

  async delete(id: string, userId: string): Promise<void> {
    const supabase = this.databaseService.getClient();
    const { error }: { data: null; error: PostgrestError | null } =
      await supabase.from('videos').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      throw new InternalServerErrorException('Failed to delete video.');
    }
  }

  async updateStatus(
    id: string,
    status: Video['status'],
    errorMessage?: string,
  ): Promise<Video> {
    const supabase = this.databaseService.getClient();
    const updateData: any = { status };

    if (errorMessage !== undefined) {
      updateData.job_error_message = errorMessage;
    }

    const {
      data,
      error,
    }: { data: Video | null; error: PostgrestError | null } = await supabase
      .from('videos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException('Failed to update video status.');
    }

    if (!data) {
      throw new NotFoundException('Video not found.');
    }

    return data;
  }

  async updateActiveTranscriptType(
    id: string,
    userId: string,
    type: 'original' | 'edited',
  ): Promise<Video> {
    const supabase = this.databaseService.getClient();
    const {
      data,
      error,
    }: { data: Video | null; error: PostgrestError | null } = await supabase
      .from('videos')
      .update({ active_transcript_type: type })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(
        `Failed to update active transcript type: ${error.message}`,
      );
    }

    if (!data) {
      throw new NotFoundException('Video not found.');
    }

    return data;
  }

  async updateTranscript(
    videoId: string,
    userId: string,
    transcriptData: any,
    version: 'original' | 'edited' = 'edited',
  ): Promise<Video> {
    const supabase = this.databaseService.getClient();

    // First, verify the video belongs to the user
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id')
      .eq('id', videoId)
      .eq('user_id', userId)
      .single();

    if (videoError || !video) {
      throw new NotFoundException('Video not found.');
    }

    // Update the transcript data
    const fieldToUpdate =
      version === 'original'
        ? 'transcript_data'
        : 'edited_transcript_data';
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .update({
        [fieldToUpdate]: transcriptData,
        updated_at: new Date(),
      })
      .eq('video_id', videoId)
      .select()
      .single();

    if (transcriptError) {
      throw new InternalServerErrorException(
        `Failed to update transcript: ${transcriptError.message}`,
      );
    }

    // Return the updated video with transcript data
    return this.findOne(videoId, userId);
  }

  async updateCaptionStyle(
    videoId: string,
    userId: string,
    captionStyle: any,
  ): Promise<Video> {
    const supabase = this.databaseService.getClient();

    const { data: video, error } = await supabase
      .from('videos')
      .update({ caption_style: captionStyle })
      .eq('id', videoId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(
        `Failed to update caption style: ${error.message}`,
      );
    }

    if (!video) {
      throw new NotFoundException('Video not found.');
    }

    return video;
  }
}
