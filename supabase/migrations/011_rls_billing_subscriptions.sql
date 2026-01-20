-- RLS Policies for billing_subscriptions table
-- Users can only view/update their own subscriptions

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.billing_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.billing_subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.billing_subscriptions;

-- Policy: Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.billing_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can update their own subscriptions
-- (Typically updated by webhook, but allowing user updates for safety)
CREATE POLICY "Users can update their own subscriptions"
  ON public.billing_subscriptions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Note: Insert/delete of subscriptions should be handled by service role
-- via Stripe webhooks. Regular users should not create/delete subscriptions directly.


