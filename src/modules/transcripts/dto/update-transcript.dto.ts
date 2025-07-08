import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class UpdateTranscriptDto {
  @IsObject()
  @IsNotEmpty()
  transcript_data: any; // This will hold the full JSON structure from OpenAI

  @IsOptional()
  @IsString()
  text?: string; // If we decide to send just the plain text for simplicity
}
