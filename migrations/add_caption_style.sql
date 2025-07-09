-- Migration to add caption style options to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS caption_style JSONB DEFAULT '{
  "style": "tiktok",
  "fontSize": 32,
  "fontColor": "white",
  "fontFamily": "Arial Black",
  "strokeColor": "black",
  "strokeWidth": 3,
  "backgroundColor": "black",
  "backgroundOpacity": 0.8,
  "position": "center",
  "maxWordsPerLine": 3,
  "marginVertical": 100,
  "marginHorizontal": 60,
  "shadowEnabled": true,
  "shadowColor": "black",
  "shadowOffset": {"x": 2, "y": 2}
}';

-- Add index for caption_style queries
CREATE INDEX IF NOT EXISTS idx_videos_caption_style ON videos USING GIN (caption_style);

-- Add comment for documentation
COMMENT ON COLUMN videos.caption_style IS 'JSON configuration for caption styling options (TikTok-style, traditional, etc.)';
