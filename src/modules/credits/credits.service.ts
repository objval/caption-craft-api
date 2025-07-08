import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';

@Injectable()
export class CreditsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getBalance(userId: string): Promise<number> {
    const client = this.databaseService.getClient();
    const { data, error } = await client
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();

    if (error) {
      throw new InternalServerErrorException('Failed to fetch credit balance.');
    }

    // If no data is found (e.g., profile not yet created), return 0 credits
    if (!data) {
      return 0;
    }

    return data.credits;
  }

  async deduct(userId: string, amount: number): Promise<void> {
    const client = this.databaseService.getClient();
    const { error } = await client.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: amount,
    });

    if (error) {
      if (error.code === 'P0001') {
        // Raised exception in Postgres
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to deduct credits.');
    }
  }

  async listPacks() {
    const client = this.databaseService.getClient();
    const { data, error } = await client.from('credit_packs').select('*');

    if (error) {
      throw new InternalServerErrorException('Failed to fetch credit packs.');
    }

    return data;
  }
}
