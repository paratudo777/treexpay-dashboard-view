
-- Add a column to store the OneSignal player ID for each user
ALTER TABLE public.profiles
ADD COLUMN onesignal_player_id TEXT;
