# Studioside

Multi-tenant SaaS application for music studio management built with Next.js, Supabase, and Stripe.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL + RLS)
- **Authentication**: Supabase Auth
- **Payments**: Stripe Subscriptions
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Project Structure

```
studioside/
├── app/                    # Next.js App Router pages
│   ├── (app)/             # Protected app routes
│   ├── api/               # API routes (webhooks)
│   ├── join/              # Invite acceptance flow
│   └── upgrade/           # Subscription pages
├── src/
│   ├── actions/           # Server actions
│   ├── components/         # React components
│   ├── data/              # Data fetching functions
│   ├── lib/               # Utilities & clients
│   └── types/             # TypeScript types
├── supabase/
│   └── migrations/        # Database migrations (001-011)
└── public/                # Static assets
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXT_PUBLIC_APP_URL` - Your app URL (default: http://localhost:3000)
- `STRIPE_SECRET_KEY` - Stripe secret key (optional for development)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret (optional)
- `STRIPE_PRICE_ID` - Stripe price ID (optional)

### 3. Database Setup

**This project uses Supabase CLI for migrations.**

Run all migrations:

```bash
supabase db push
```

Or if you need to run migrations manually:
1. Go to Supabase Dashboard → SQL Editor
2. Run each migration file in order (001_profiles.sql through 011_rls_billing_subscriptions.sql)

### 4. Configure Supabase Auth

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Email/Password authentication
3. Configure any additional providers as needed

### Invite Emails (Supabase built-in)

- Ensure SMTP is configured in Supabase Auth.
- Set the **Invite user** email template body/subject; links should redirect to `NEXT_PUBLIC_APP_URL/join?token=...`.
- Keep `NEXT_PUBLIC_APP_URL` pointed at your app base (use `http://localhost:3000` in dev).
- Invites send via `auth.admin.generateLink({ type: 'invite', redirectTo: <app>/join?token=... })` after a studio invite is created.

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Development Workflow

### Running Migrations

When you add new migrations:

```bash
# Create a new migration
supabase migration new migration_name

# Apply migrations
supabase db push

# Reset database (careful - deletes all data)
supabase db reset
```

### Database Migrations

All migrations are in `supabase/migrations/` and should be run in order:

1. `001_profiles.sql` - User profiles table
2. `002_studios.sql` - Studios table
3. `003_studio_memberships.sql` - Memberships table
4. `004_studio_invitations.sql` - Invitations table
5. `005_billing_subscriptions.sql` - Billing subscriptions
6. `006_utils_current_studio.sql` - Helper functions
7. `007_rls_profiles.sql` - RLS policies for profiles
8. `008_rls_studios.sql` - RLS policies for studios
9. `009_rls_memberships.sql` - RLS policies for memberships
10. `010_rls_invitations.sql` - RLS policies for invitations
11. `011_rls_billing_subscriptions.sql` - RLS policies for billing

## Architecture

### Multi-Tenant Design

- **Current Studio**: Stored in server-side cookie (`current_studio_id`)
- **RLS**: All queries filtered by `current_studio_id()` function
- **Memberships**: Users belong to multiple studios via `studio_memberships`
- **Paywall**: Studio creation requires active Stripe subscription

### Key Features

- ✅ Multi-tenant studio management
- ✅ Row Level Security (RLS) for data isolation
- ✅ Token-based invitations (free to accept)
- ✅ Stripe subscription paywall
- ✅ Studio switching
- ✅ Team management

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Stripe Setup

See `STRIPE_SETUP.md` for detailed Stripe integration instructions.

## Troubleshooting

### "Missing Supabase environment variables"
- Ensure `.env.local` exists and has all required Supabase variables
- Restart the dev server after adding environment variables

### Database errors
- Verify migrations have been run: `supabase db push`
- Check Supabase dashboard for connection issues

### RLS policy errors
- Ensure `current_studio_id()` function exists (migration 006)
- Verify user is a member of the studio they're accessing

## Notes

- **Database Tool**: Supabase CLI (`supabase db push`)
- **Environment File**: `.env.local` (not committed to git)
- **Migrations**: All in `supabase/migrations/` directory








# studioside
