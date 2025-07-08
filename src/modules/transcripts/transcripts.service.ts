import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class TranscriptsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async updateEditedTranscript(
    transcriptId: string,
    editedData: { transcript_data: any }, // Expecting the full JSON structure from DTO
  ): Promise<any> {
    const supabase = this.databaseService.getClient();

    // For now, we directly save the provided edited_transcript_data.
    // The frontend is responsible for managing the granular changes (words, segments).
    const { data, error } = await supabase
      .from('transcripts')
      .update({
        edited_transcript_data: editedData.transcript_data,
        updated_at: new Date(),
      })
      .eq('id', transcriptId)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(
        `Failed to update edited transcript: ${error.message}`,
      );
    }
    return data;
  }
}
