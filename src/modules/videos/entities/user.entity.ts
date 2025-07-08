export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  credits: number;
  status: 'active' | 'suspended' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface UserCreateDto {
  email: string;
  name?: string;
  avatar_url?: string;
  credits?: number;
  status?: 'active' | 'suspended' | 'deleted';
}

export interface UserUpdateDto {
  name?: string;
  avatar_url?: string;
  credits?: number;
  status?: 'active' | 'suspended' | 'deleted';
}
