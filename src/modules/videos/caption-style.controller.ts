import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { GetUser } from '../../core/auth/decorators/get-user.decorator';
import { DatabaseService } from '../../core/database/database.service';
import { TIKTOK_CAPTION_PRESETS } from '../../core/config/caption-styles';
import { TikTokStyleOptions } from '../../shared/services/ffmpeg.service';

@Controller('v1/videos/:videoId/caption-style')
@UseGuards(JwtAuthGuard)
export class CaptionStyleController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get('presets')
  async getPresets() {
    return {
      presets: TIKTOK_CAPTION_PRESETS,
      message: 'Available caption style presets',
    };
  }

  @Get()
  async getCaptionStyle(
    @Param('videoId') videoId: string,
    @GetUser() user: any,
  ) {
    const supabase = this.databaseService.getClient();
    
    const { data: video, error } = await supabase
      .from('videos')
      .select('caption_style')
      .eq('id', videoId)
      .eq('user_id', user.sub)
      .single();

    if (error) {
      throw new Error(`Failed to fetch video: ${error.message}`);
    }

    return {
      captionStyle: video.caption_style,
      message: 'Caption style retrieved successfully',
    };
  }

  @Patch()
  async updateCaptionStyle(
    @Param('videoId') videoId: string,
    @Body() updateData: { captionStyle: TikTokStyleOptions },
    @GetUser() user: any,
  ) {
    const supabase = this.databaseService.getClient();
    
    const { data: video, error } = await supabase
      .from('videos')
      .update({ caption_style: updateData.captionStyle })
      .eq('id', videoId)
      .eq('user_id', user.sub)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update caption style: ${error.message}`);
    }

    return {
      video,
      message: 'Caption style updated successfully',
    };
  }

  @Patch('preset/:presetName')
  async applyPreset(
    @Param('videoId') videoId: string,
    @Param('presetName') presetName: string,
    @GetUser() user: any,
  ) {
    const preset = TIKTOK_CAPTION_PRESETS[presetName];
    
    if (!preset) {
      throw new Error(`Preset "${presetName}" not found`);
    }

    const supabase = this.databaseService.getClient();
    
    const { data: video, error } = await supabase
      .from('videos')
      .update({ caption_style: preset })
      .eq('id', videoId)
      .eq('user_id', user.sub)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to apply preset: ${error.message}`);
    }

    return {
      video,
      appliedPreset: presetName,
      message: `Preset "${presetName}" applied successfully`,
    };
  }
}
