-- Add is_additional column to service_prices table
ALTER TABLE public.service_prices 
ADD COLUMN is_additional BOOLEAN NOT NULL DEFAULT false;