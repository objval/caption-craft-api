import { SetMetadata } from '@nestjs/common';

export const CREDITS_KEY = 'credits';
export const UseCredits = (amount: number) => SetMetadata(CREDITS_KEY, amount);
