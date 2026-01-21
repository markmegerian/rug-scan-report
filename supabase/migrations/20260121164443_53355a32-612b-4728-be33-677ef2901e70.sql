-- Phase 1b: Create payouts table and admin RLS policies

-- Create payouts table to track payments to businesses
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,  -- The business receiving the payout
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- pending, completed, failed
  payment_method text,  -- bank_transfer, check, paypal, other
  reference_number text,  -- Check number, transfer ID, etc.
  notes text,
  period_start date,  -- The period this payout covers
  period_end date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  created_by uuid  -- Admin who created this payout record
);

-- Enable RLS on payouts
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin access

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can view all jobs
CREATE POLICY "Admins can view all jobs"
ON public.jobs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
ON public.payments FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can view all inspections
CREATE POLICY "Admins can view all inspections"
ON public.inspections FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can view all approved estimates
CREATE POLICY "Admins can view all approved estimates"
ON public.approved_estimates FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can manage all payouts
CREATE POLICY "Admins can manage payouts"
ON public.payouts FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Businesses can view their own payouts
CREATE POLICY "Users can view their own payouts"
ON public.payouts FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Add updated_at trigger for payouts
CREATE TRIGGER update_payouts_updated_at
BEFORE UPDATE ON public.payouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Assign admin role to platform owner
INSERT INTO public.user_roles (user_id, role)
VALUES ('94db7bee-b556-45c3-81d6-376cc69bcf06', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;