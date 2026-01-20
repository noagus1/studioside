# Supabase Migrations

This project uses **Supabase CLI** for database migrations.

## Running Migrations

To apply all migrations to your Supabase database:

```bash
supabase db push
```

## Migration Order

Migrations must be run in this order:

1. `001_profiles.sql` - User profiles table
2. `002_studios.sql` - Studios table
3. `003_studio_memberships.sql` - Memberships table
4. `004_studio_invitations.sql` - Invitations table
5. `005_billing_subscriptions.sql` - Billing subscriptions
6. `006_utils_current_studio.sql` - Helper functions (`current_studio_id()`, etc.)
7. `007_rls_profiles.sql` - RLS policies for profiles
8. `008_rls_studios.sql` - RLS policies for studios
9. `009_rls_memberships.sql` - RLS policies for memberships
10. `010_rls_invitations.sql` - RLS policies for invitations
11. `011_rls_billing_subscriptions.sql` - RLS policies for billing

## Creating New Migrations

```bash
supabase migration new your_migration_name
```

This creates a new file in this directory with a timestamp prefix.

## Important Notes

- **Tool**: Supabase CLI (`supabase db push`)
- All migrations are idempotent (safe to run multiple times)
- RLS policies depend on the `current_studio_id()` function from migration 006























