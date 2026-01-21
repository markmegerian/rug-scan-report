-- Platform Settings and Fee Tracking

-- Create platform_settings table for admin-configurable settings
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage platform settings
CREATE POLICY "Admins can manage platform settings"
ON public.platform_settings FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Allow all authenticated users to view settings (needed for fee calculations)
CREATE POLICY "Authenticated users can view platform settings"
ON public.platform_settings FOR SELECT TO authenticated
USING (true);

-- Insert default platform fee percentage (10%)
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES ('platform_fee_percentage', '10', 'Platform fee percentage taken from each transaction');

-- Add platform_fee column to payments table to track fee per payment
ALTER TABLE public.payments ADD COLUMN platform_fee numeric DEFAULT 0;

-- Add net_amount column to payouts for clarity (amount after fees)
ALTER TABLE public.payouts ADD COLUMN gross_revenue numeric DEFAULT 0;
ALTER TABLE public.payouts ADD COLUMN platform_fees_deducted numeric DEFAULT 0;

-- Add trigger to update platform_settings.updated_at
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();