# Diagnostic SQL Queries for 406 PGRST116 Error

This file contains SQL queries to manually verify membership rows exist in the database, bypassing RLS for diagnostic purposes.

## Prerequisites

Run these queries as a database admin or using the Supabase admin client to bypass RLS.

## 1. Check if Membership Row Exists

Replace `<studioId>` and `<userId>` with actual UUIDs from your error logs.

```sql
-- Check if membership exists for specific studio and user
SELECT 
  id,
  studio_id,
  user_id,
  role,
  created_at,
  updated_at
FROM studio_memberships
WHERE studio_id = '<studioId>'
  AND user_id = '<userId>';
```

## 2. Check All Memberships for a Studio

```sql
-- List all memberships for a specific studio
SELECT 
  sm.id,
  sm.studio_id,
  sm.user_id,
  sm.role,
  sm.created_at,
  p.email,
  p.full_name
FROM studio_memberships sm
LEFT JOIN profiles p ON sm.user_id = p.id
WHERE sm.studio_id = '<studioId>'
ORDER BY sm.created_at;
```

## 3. Check All Memberships for a User

```sql
-- List all memberships for a specific user
SELECT 
  sm.id,
  sm.studio_id,
  sm.user_id,
  sm.role,
  sm.created_at,
  s.name as studio_name,
  s.slug as studio_slug
FROM studio_memberships sm
LEFT JOIN studios s ON sm.studio_id = s.id
WHERE sm.user_id = '<userId>'
ORDER BY sm.created_at;
```

## 4. Verify Owner Membership Was Created by Trigger

```sql
-- Check if owner membership exists for studios
-- This verifies the handle_studio_owner_membership() trigger worked
SELECT 
  s.id as studio_id,
  s.name as studio_name,
  s.owner_id,
  sm.id as membership_id,
  sm.user_id as membership_user_id,
  sm.role,
  CASE 
    WHEN sm.id IS NULL THEN 'MISSING - Trigger may have failed'
    WHEN sm.user_id != s.owner_id THEN 'MISMATCH - Wrong user_id'
    WHEN sm.role != 'owner' THEN 'WRONG ROLE - Expected owner'
    ELSE 'OK'
  END as status
FROM studios s
LEFT JOIN studio_memberships sm ON s.id = sm.studio_id AND s.owner_id = sm.user_id
ORDER BY s.created_at DESC;
```

## 5. Check for Missing Owner Memberships

```sql
-- Find studios where owner membership is missing
SELECT 
  s.id,
  s.name,
  s.owner_id,
  s.created_at
FROM studios s
WHERE NOT EXISTS (
  SELECT 1 
  FROM studio_memberships sm 
  WHERE sm.studio_id = s.id 
    AND sm.user_id = s.owner_id
)
ORDER BY s.created_at DESC;
```

## 6. Verify RLS Policy Would Allow Access

This query simulates what RLS would see (requires running as the authenticated user):

```sql
-- Check what auth.uid() returns (run as authenticated user)
SELECT auth.uid() as current_auth_uid;

-- Check what current_studio_id() returns (run as authenticated user)
SELECT current_studio_id() as current_studio_id_value;

-- Test RLS policy conditions manually
SELECT 
  sm.id,
  sm.studio_id,
  sm.user_id,
  sm.role,
  -- Condition 1: user_id = auth.uid()
  (sm.user_id = auth.uid()) as condition1_user_id_match,
  -- Condition 2: studio_id = current_studio_id()
  (sm.studio_id = current_studio_id()) as condition2_studio_id_match,
  -- Condition 3: is_studio_member check
  (is_studio_member(current_studio_id())) as condition3_is_member,
  -- Combined OR condition
  (
    sm.user_id = auth.uid()
    OR (
      sm.studio_id = current_studio_id()
      AND is_studio_member(current_studio_id())
    )
  ) as rls_policy_would_allow
FROM studio_memberships sm
WHERE sm.studio_id = '<studioId>'
  AND sm.user_id = '<userId>';
```

## 7. Check Studio Invitations and Acceptance

```sql
-- Check if invitation was accepted and membership created
SELECT 
  si.id as invitation_id,
  si.studio_id,
  si.email,
  si.role as invited_role,
  si.accepted_at,
  si.expires_at,
  sm.id as membership_id,
  sm.user_id,
  sm.role as membership_role,
  CASE 
    WHEN si.accepted_at IS NULL AND sm.id IS NULL THEN 'PENDING - Not accepted yet'
    WHEN si.accepted_at IS NOT NULL AND sm.id IS NULL THEN 'ACCEPTED BUT NO MEMBERSHIP - Bug!'
    WHEN si.accepted_at IS NULL AND sm.id IS NOT NULL THEN 'MEMBERSHIP EXISTS BUT NOT ACCEPTED - Bug!'
    ELSE 'OK - Accepted and membership exists'
  END as status
FROM studio_invitations si
LEFT JOIN studio_memberships sm ON si.studio_id = sm.studio_id 
  AND sm.user_id = (SELECT id FROM auth.users WHERE email = si.email)
WHERE si.studio_id = '<studioId>'
ORDER BY si.created_at DESC;
```

## 8. Find Orphaned Memberships

```sql
-- Find memberships without corresponding studios (shouldn't exist due to CASCADE)
SELECT 
  sm.id,
  sm.studio_id,
  sm.user_id,
  sm.role
FROM studio_memberships sm
WHERE NOT EXISTS (
  SELECT 1 FROM studios s WHERE s.id = sm.studio_id
);
```

## Usage Instructions

1. Copy the relevant query
2. Replace `<studioId>` and `<userId>` with actual values from your error logs
3. Run in Supabase SQL Editor or via admin client
4. Compare results with diagnostic logs from the application

## Expected Results

- **Query 1**: Should return exactly 1 row if membership exists
- **Query 4**: All studios should have status 'OK'
- **Query 5**: Should return 0 rows (no missing owner memberships)
- **Query 6**: `rls_policy_would_allow` should be `true` for the membership row

