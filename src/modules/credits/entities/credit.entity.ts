export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'earned' | 'spent' | 'refunded';
  description: string;
  video_id?: string;
  created_at: string;
}

export interface CreditTransactionCreateDto {
  user_id: string;
  amount: number;
  type: 'earned' | 'spent' | 'refunded';
  description: string;
  video_id?: string;
}

export interface CreditBalance {
  user_id: string;
  balance: number;
  last_updated: string;
}
