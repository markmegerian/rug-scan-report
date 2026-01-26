-- Create push_tokens table to store device push notification tokens
CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

-- Enable RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own push tokens
CREATE POLICY "Users can view their own push tokens"
ON public.push_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own push tokens
CREATE POLICY "Users can insert their own push tokens"
ON public.push_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own push tokens
CREATE POLICY "Users can update their own push tokens"
ON public.push_tokens
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own push tokens
CREATE POLICY "Users can delete their own push tokens"
ON public.push_tokens
FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_push_tokens_updated_at
BEFORE UPDATE ON public.push_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for looking up tokens by user
CREATE INDEX idx_push_tokens_user_id ON public.push_tokens(user_id);