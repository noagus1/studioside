# Stripe Production Setup Guide

## Quick Checklist

- [x] Environment variables added to Vercel
- [ ] Production product created in Stripe Dashboard
- [ ] Production webhook endpoint configured
- [ ] Test subscription flow end-to-end

## Step 1: Create Production Product in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. **Switch to Live mode** (toggle in top right)
3. Navigate to **Products**
4. Click **+ Add product**
5. Fill in:
   - **Name**: "Studioside Subscription" (or your choice)
   - **Description**: Optional
   - **Pricing**: 
     - Select **Recurring** (monthly or yearly)
     - Set your price (e.g., $20/month)
   - Click **Save product**
6. **Copy the Price ID** (starts with `price_...`)
7. Update `STRIPE_PRICE_ID` in Vercel environment variables with this production Price ID

## Step 2: Configure Production Webhook

1. In Stripe Dashboard (Live mode), go to **Developers → Webhooks**
2. Click **+ Add endpoint**
3. Enter endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
   - Replace `yourdomain.com` with your actual Vercel domain
4. Under **Events to send**, select:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**
6. **Copy the Signing secret** (starts with `whsec_...`)
7. Update `STRIPE_WEBHOOK_SECRET` in Vercel environment variables

## Step 3: Verify Environment Variables in Vercel

Make sure these are set in Vercel (Settings → Environment Variables):

- `STRIPE_SECRET_KEY` = `sk_live_...` (Live mode secret key)
- `STRIPE_PRICE_ID` = `price_...` (Production price ID from Step 1)
- `STRIPE_WEBHOOK_SECRET` = `whsec_...` (Webhook secret from Step 2)
- `NEXT_PUBLIC_APP_URL` = `https://yourdomain.com` (Your production URL)

## Step 4: Test the Flow

1. **Deploy to production** (or ensure latest code is deployed)
2. Visit `https://yourdomain.com/upgrade`
3. Click "Subscribe with Stripe"
4. Use a **test card** (Stripe will show test mode if using test keys):
   - Card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC
   - Any ZIP
5. Complete checkout
6. Verify:
   - Redirects to `/upgrade/success`
   - Check Stripe Dashboard → Customers → See new customer
   - Check Stripe Dashboard → Subscriptions → See active subscription
   - Check Stripe Dashboard → Webhooks → See successful webhook deliveries
   - Check Supabase `billing_subscriptions` table → See subscription record
   - Try creating a studio → Should work now!

## Step 5: Monitor Webhooks

After test subscription:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. Check **Recent events** tab
4. Verify you see:
   - `customer.subscription.created` (success)
   - `checkout.session.completed` (if enabled)

If webhooks are failing:
- Check the error message in Stripe Dashboard
- Verify `STRIPE_WEBHOOK_SECRET` matches the signing secret
- Check Vercel function logs for errors

## Troubleshooting

### "Stripe is not configured"
- Verify `STRIPE_SECRET_KEY` is set in Vercel
- Make sure you're using **Live mode** key (`sk_live_...`) for production
- Redeploy after adding env vars

### Webhook 400 errors
- Verify `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe Dashboard
- Check webhook endpoint URL is correct
- Ensure webhook is in **Live mode** (not Test mode)

### Subscriptions not appearing in database
- Check webhook events in Stripe Dashboard → see if they're being sent
- Check Vercel function logs for webhook handler errors
- Verify webhook endpoint URL is accessible
- Check that customer metadata includes `user_id`

### Paywall not working
- Verify `NODE_ENV` is not 'development' in production
- Check that `ENABLE_STRIPE_PAYWALL` is not set to 'false' (if you set it)
- Verify subscription status is 'active' and `current_period_end > now()`

## Going Live Checklist

Before accepting real payments:
- [ ] Test with real card (small amount) to verify flow
- [ ] Verify webhook events are being received
- [ ] Check `billing_subscriptions` table has correct data
- [ ] Test studio creation after subscription
- [ ] Monitor first few real subscriptions closely
- [ ] Set up Stripe email notifications for failed payments

## Optional: Enable Paywall in Development

If you want to test the paywall locally:
1. Add to `.env.local`: `ENABLE_STRIPE_PAYWALL=true`
2. Restart dev server
3. Paywall will now be enforced even in development
