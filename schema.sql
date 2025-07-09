-- Create the profiles table to store public user data
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  credits INTEGER DEFAULT 0
);

-- Create the videos table
CREATE TYPE video_status AS ENUM ('uploading', 'processing', 'ready', 'burning_in', 'complete', 'failed');
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  status video_status DEFAULT 'uploading',
  original_video_cloudinary_id TEXT,
  final_video_cloudinary_id TEXT,
  thumbnail_url TEXT,
  active_transcript_type TEXT NOT NULL DEFAULT 'original',
  caption_style JSONB DEFAULT '{
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
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_active_transcript_type CHECK (active_transcript_type IN ('original', 'edited'))
);

-- Create the transcripts table
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  transcript_data JSONB,
  edited_transcript_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the credit_packs table
CREATE TABLE credit_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  credits_amount INTEGER NOT NULL,
  price_usd NUMERIC(10, 2) NOT NULL
);

-- Create the credit_transactions table
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_changed INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to create a profile for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable Row Level Security for all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile." ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage their own videos." ON videos FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage transcripts for their videos." ON transcripts FOR ALL USING (EXISTS (
  SELECT 1 FROM videos WHERE videos.id = transcripts.video_id AND videos.user_id = auth.uid()
));

CREATE POLICY "Authenticated users can view credit packs." ON credit_packs FOR SELECT USING (true);

CREATE POLICY "Users can view their own credit transactions." ON credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- Function to deduct credits atomically
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Select the current credits into a variable, with a lock to prevent race conditions
  SELECT credits INTO current_credits FROM profiles WHERE id = p_user_id FOR UPDATE;

  -- Check if the user has enough credits
  IF current_credits < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits. You need at least % credits to perform this action.', p_amount;
  END IF;

  -- Deduct the credits
  UPDATE profiles SET credits = credits - p_amount WHERE id = p_user_id;

  -- Log the transaction
  INSERT INTO credit_transactions (user_id, amount_changed, reason)
  VALUES (p_user_id, -p_amount, 'Action');

END;
$$ LANGUAGE plpgsql;
