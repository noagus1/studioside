# Stripe Integration Setup

This document outlines the required environment variables and setup steps for Stripe integration in Studioside.

## 🚀 Quick Start: Local Development

Follow these steps to enable Stripe on your local development environment:

### Step 1: Get Stripe Test Keys

1. Sign up or log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Test mode** (toggle in the top right)
3. Go to **Developers → API keys**
4. Copy your **Secret key** (starts with `sk_test_...`)

### Step 2: Create a Test Product and Price

1. In Stripe Dashboard, go to **Products**
2. Click **+ Add product**
3. Name it (e.g., "Studioside Subscription")
4. Add a recurring price (monthly or yearly)
5. Copy the **Price ID** (starts with `price_...`)

### Step 3: Install Stripe CLI (for webhook testing)

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from https://stripe.com/docs/stripe-cli
```

### Step 4: Authenticate Stripe CLI

```bash
stripe login
```

This will open your browser to authenticate the CLI with your Stripe account.

### Step 5: Set Up Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Configuration (Test Mode)
STRIPE_SECRET_KEY=sk_test_...                    # From Step 1
STRIPE_PRICE_ID=price_...                        # From Step 2
NEXT_PUBLIC_APP_URL=http://localhost:3000        # Your local URL

# Note: STRIPE_WEBHOOK_SECRET will be set in Step 6
```

### Step 6: Start Webhook Forwarding

In a **separate terminal**, run:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This will:
- Forward Stripe webhook events to your local server
- Display a webhook signing secret (starts with `whsec_...`)

**Copy the webhook secret** and add it to your `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...                  # From stripe listen output
```

### Step 7: Restart Your Dev Server

```bash
# Stop your current dev server (Ctrl+C)
# Then restart it
npm run dev
```

### Step 8: Test It!

1. Visit `http://localhost:3000/upgrade`
2. Click "Subscribe"
3. Use Stripe test card: `4242 4242 4242 4242`
4. Use any future expiry date, any CVC, any ZIP
5. Complete the checkout
6. Check your terminal running `stripe listen` - you should see webhook events
7. Check Supabase `billing_subscriptions` table - your subscription should appear

### Troubleshooting Local Setup

- **"Stripe is not configured"**: Make sure `STRIPE_SECRET_KEY` is set in `.env.local` and you've restarted the dev server
- **Webhook errors**: Make sure `stripe listen` is running and `STRIPE_WEBHOOK_SECRET` matches the output
- **No webhook events**: Check that `stripe listen` is forwarding to the correct URL

---

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...                    # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...                  # Webhook signing secret
STRIPE_PRICE_ID=price_...                        # Your subscription price ID

# Application URL
NEXT_PUBLIC_APP_URL=https://your-domain.com      # Your app URL (or http://localhost:3000 for dev)

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Stripe Setup Steps

### 1. Create a Stripe Account
- Sign up at https://stripe.com
- Get your API keys from the Dashboard

### 2. Create a Product and Price
- Go to Products in Stripe Dashboard
- Create a new product (e.g., "Studioside Subscription")
- Add a recurring price (monthly or yearly)
- Copy the Price ID (starts with `price_`)

### 3. Set Up Webhooks
- Go to Developers → Webhooks in Stripe Dashboard
- Add endpoint: `https://your-domain.com/api/webhooks/stripe`
- Select events to listen for:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Copy the webhook signing secret (starts with `whsec_`)

### 4. Test Webhooks Locally (Optional)
- Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- This will give you a webhook secret for local testing

## How It Works

1. **User Subscribes**: User clicks "Subscribe" on `/upgrade` page
2. **Checkout Session**: Server action creates Stripe Checkout session
3. **Payment**: User completes payment on Stripe Checkout
4. **Webhook**: Stripe sends webhook events to `/api/webhooks/stripe`
5. **Database Update**: Webhook handler updates `billing_subscriptions` table
6. **Paywall**: `createStudio` action checks subscription status before allowing studio creation

## Subscription Status

The system checks for active subscriptions using:
- `status = 'active'`
- `current_period_end > now()`

This is enforced in:
- `getActiveSubscription()` data function
- `createStudio()` server action

## Testing

1. Use Stripe test mode keys
2. Use test card: `4242 4242 4242 4242`
3. Monitor webhook events in Stripe Dashboard
4. Check `billing_subscriptions` table in Supabase

