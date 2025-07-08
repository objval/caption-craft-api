export interface Video {
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
  created_at?: string;
  transcripts?: Transcript[];
  active_transcript_type?: 'original' | 'edited';
}

export interface Transcript {
  id: string;
  video_id: string;
  transcript_data?: any;
  edited_transcript_data?: any;
  updated_at?: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount_changed: number;
  reason: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  credits: number;
}

export interface CreditPack {
  id: string;
  name: string;
  credits_amount: number;
  price_usd: number;
}

export type VideoStatus = Video['status'];
export type TranscriptType = Video['active_transcript_type'];
