import { Controller, Put, Param, Body, UseGuards } from '@nestjs/common';
import { TranscriptsService } from './transcripts.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { UpdateTranscriptDto } from './dto/update-transcript.dto';

@Controller('transcripts')
export class TranscriptsController {
  constructor(private readonly transcriptsService: TranscriptsService) {}

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  updateEditedTranscript(
    @Param('id') id: string,
    @Body() editedData: UpdateTranscriptDto,
  ) {
    return this.transcriptsService.updateEditedTranscript(id, editedData);
  }
}
