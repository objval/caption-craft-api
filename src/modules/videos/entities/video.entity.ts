export interface VideoEntity {
  id: string;
  user_id: string;
  title: string;
  status:
    | 'uploading'
    | 'processing'
    | 'ready'
    | 'burning_in'
    | 'complete'
    | 'failed';
  original_video_cloudinary_id?: string;
  final_video_cloudinary_id?: string;
  thumbnail_url?: string;
  job_error_message?: string;
  active_transcript_type?: 'original' | 'edited';
  created_at: string;
  updated_at: string;
  transcripts?: TranscriptEntity[];
}

export interface TranscriptEntity {
  id: string;
  video_id: string;
  type: 'original' | 'edited';
  content: string;
  created_at: string;
  updated_at: string;
}

export interface VideoCreateDto {
  user_id: string;
  title: string;
  status?: VideoEntity['status'];
}

export interface VideoUpdateDto {
  title?: string;
  status?: VideoEntity['status'];
  original_video_cloudinary_id?: string;
  final_video_cloudinary_id?: string;
  thumbnail_url?: string;
  job_error_message?: string;
  active_transcript_type?: 'original' | 'edited';
}

export interface TranscriptCreateDto {
  video_id: string;
  type: 'original' | 'edited';
  content: string;
}

export interface TranscriptUpdateDto {
  content?: string;
  type?: 'original' | 'edited';
}
