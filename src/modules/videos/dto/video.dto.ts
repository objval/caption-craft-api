import { IsString, IsEnum, IsOptional } from 'class-validator';
import { TranscriptType } from '../../../shared/types';

export class CreateVideoDto {
  @IsString()
  title: string;

  @IsString()
  filePath: string;

  @IsString()
  userId: string;
}

export class UpdateVideoDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum([
    'uploading',
    'processing',
    'ready',
    'burning_in',
    'complete',
    'failed',
  ])
  @IsOptional()
  status?:
    | 'uploading'
    | 'processing'
    | 'ready'
    | 'burning_in'
    | 'complete'
    | 'failed';

  @IsString()
  @IsOptional()
  original_video_cloudinary_id?: string;

  @IsString()
  @IsOptional()
  final_video_cloudinary_id?: string;

  @IsString()
  @IsOptional()
  thumbnail_url?: string;

  @IsString()
  @IsOptional()
  job_error_message?: string;

  @IsEnum(['original', 'edited'])
  @IsOptional()
  active_transcript_type?: TranscriptType;
}

export class UpdateVideoStatusDto {
  @IsEnum([
    'uploading',
    'processing',
    'ready',
    'burning_in',
    'complete',
    'failed',
  ])
  status:
    | 'uploading'
    | 'processing'
    | 'ready'
    | 'burning_in'
    | 'complete'
    | 'failed';
}

export class UpdateActiveTranscriptTypeDto {
  @IsEnum(['original', 'edited'])
  active_transcript_type: TranscriptType;
}

export class VideoResponseDto {
  id: string;
  user_id: string;
  title: string;
  status: string;
  original_video_cloudinary_id?: string;
  final_video_cloudinary_id?: string;
  thumbnail_url?: string;
  created_at?: string;
  transcripts?: any[];
  active_transcript_type?: 'original' | 'edited';
}
