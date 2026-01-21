-- Add business_address column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_address text;