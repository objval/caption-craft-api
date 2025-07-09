-- Migration: Add caption_style column to videos table
-- Date: 2025-07-09
-- Description: Add JSONB column to store caption styling options for video burn-in

-- Add caption_style column to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS caption_style JSONB DEFAULT '{
  "fontFamily": "Arial",
  "fontSize": 24,
  "fontColor": "white",
  "backgroundColor": "black",
  "backgroundOpacity": 0.8,
  "position": "bottom",
  "alignment": "center",
  "outline": true,
  "outlineColor": "black",
  "outlineWidth": 2,
  "shadow": true,
  "shadowColor": "black",
  "shadowOffsetX": 2,
  "shadowOffsetY": 2,
  "maxWidth": 80,
  "lineSpacing": 1.2,
  "wordWrap": true,
  "animationStyle": "none",
  "preset": "default"
}';

-- Update existing videos to have default caption style
UPDATE videos 
SET caption_style = '{
  "fontFamily": "Arial",
  "fontSize": 24,
  "fontColor": "white",
  "backgroundColor": "black",
  "backgroundOpacity": 0.8,
  "position": "bottom",
  "alignment": "center",
  "outline": true,
  "outlineColor": "black",
  "outlineWidth": 2,
  "shadow": true,
  "shadowColor": "black",
  "shadowOffsetX": 2,
  "shadowOffsetY": 2,
  "maxWidth": 80,
  "lineSpacing": 1.2,
  "wordWrap": true,
  "animationStyle": "none",
  "preset": "default"
}'
WHERE caption_style IS NULL;

-- Add comment to the column for documentation
COMMENT ON COLUMN videos.caption_style IS 'JSONB object containing caption styling options for video burn-in process';
