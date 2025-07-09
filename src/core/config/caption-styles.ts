import { TikTokStyleOptions } from '../../shared/services/ffmpeg.service';

export const TIKTOK_CAPTION_PRESETS: Record<string, TikTokStyleOptions> = {
  // Modern TikTok style - bold, high contrast
  tiktokModern: {
    fontSize: 36,
    fontColor: 'white',
    fontFamily: 'Arial Black',
    strokeColor: 'black',
    strokeWidth: 4,
    backgroundColor: 'black',
    backgroundOpacity: 0.9,
    position: 'center',
    maxWordsPerLine: 3,
    marginVertical: 120,
    marginHorizontal: 80,
    shadowEnabled: true,
    shadowColor: 'black',
    shadowOffset: { x: 3, y: 3 },
  },

  // Classic TikTok style - slightly smaller, more readable
  tiktokClassic: {
    fontSize: 32,
    fontColor: 'white',
    fontFamily: 'Arial Bold',
    strokeColor: 'black',
    strokeWidth: 3,
    backgroundColor: 'black',
    backgroundOpacity: 0.8,
    position: 'center',
    maxWordsPerLine: 4,
    marginVertical: 100,
    marginHorizontal: 60,
    shadowEnabled: true,
    shadowColor: 'black',
    shadowOffset: { x: 2, y: 2 },
  },

  // Instagram Reels style - cleaner, more minimalist
  instagramReels: {
    fontSize: 28,
    fontColor: 'white',
    fontFamily: 'Helvetica Bold',
    strokeColor: 'black',
    strokeWidth: 2,
    backgroundColor: 'black',
    backgroundOpacity: 0.7,
    position: 'center',
    maxWordsPerLine: 5,
    marginVertical: 80,
    marginHorizontal: 40,
    shadowEnabled: false,
    shadowColor: 'black',
    shadowOffset: { x: 0, y: 0 },
  },

  // YouTube Shorts style - similar to TikTok but slightly different
  youtubeShorts: {
    fontSize: 34,
    fontColor: 'white',
    fontFamily: 'Arial Black',
    strokeColor: 'black',
    strokeWidth: 3,
    backgroundColor: 'black',
    backgroundOpacity: 0.85,
    position: 'bottom',
    maxWordsPerLine: 3,
    marginVertical: 60,
    marginHorizontal: 50,
    shadowEnabled: true,
    shadowColor: 'black',
    shadowOffset: { x: 2, y: 2 },
  },

  // Professional/Business style - more subtle
  professional: {
    fontSize: 26,
    fontColor: 'white',
    fontFamily: 'Arial',
    strokeColor: 'black',
    strokeWidth: 1,
    backgroundColor: 'black',
    backgroundOpacity: 0.6,
    position: 'bottom',
    maxWordsPerLine: 6,
    marginVertical: 40,
    marginHorizontal: 30,
    shadowEnabled: false,
    shadowColor: 'black',
    shadowOffset: { x: 0, y: 0 },
  },

  // Colorful/Fun style - for entertainment content
  colorfulFun: {
    fontSize: 30,
    fontColor: 'yellow',
    fontFamily: 'Arial Black',
    strokeColor: 'purple',
    strokeWidth: 3,
    backgroundColor: 'navy',
    backgroundOpacity: 0.8,
    position: 'center',
    maxWordsPerLine: 3,
    marginVertical: 100,
    marginHorizontal: 60,
    shadowEnabled: true,
    shadowColor: 'black',
    shadowOffset: { x: 2, y: 2 },
  },
};

export const DEFAULT_TIKTOK_STYLE = TIKTOK_CAPTION_PRESETS.tiktokModern;
