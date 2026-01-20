# Diagnostic Analysis: 406 PGRST116 Error

## Executive Summary

Based on code analysis, the 406 PGRST116 error is **most likely caused by `.single()` being used when RLS returns 0 rows**. However, we need actual diagnostic logs to confirm whether:
1. The membership row doesn't exist (database issue)
2. RLS is blocking the row (policy issue)
3. ID mismatches are preventing the query from matching (cookie/auth issue)

---

## 1. Does `.single()` Cause the 406?

### ✅ **YES - HIGH PROBABILITY**

**Primary Suspect:** `src/data/getMembership.ts:140`

```typescript
const { data, error } = await supabase
  .from('studio_memberships')
  .select('*')
  .eq('studio_id', studioId)
  .eq('user_id', user.id)
  .single()  // ← This causes 406 when 0 rows returned
```

**Analysis:**
- `.single()` forces `accept: application/vnd.pgrst.object+json` header
- When query returns 0 rows → PostgREST throws 406 PGRST116
- Error handling exists (line 153) but error occurs **before** it can be caught
- The function already has a row count check (lines 105-120) that runs **before** `.single()`

**What the Logs Should Show:**
```
[DIAG] Row count query result (before .single()): {
  rowCount: 0,  // ← If this is 0, .single() will cause 406
  exactCount: 0,
  error: 'none'
}
[DIAG] Query result: {
  hasData: false,
  errorCode: 'PGRST116',  // ← Confirms .single() caused it
  errorMessage: 'The result contains 0 rows'
}
```

**Risk Assessment:**
- **HIGH** - This is the most likely source
- Even if RLS is correct, 0 rows + `.single()` = 406
- The row count diagnostic (line 105) will reveal if RLS returns 0 rows

---

## 2. Does the Membership Row Actually Exist?

### ⚠️ **UNKNOWN - REQUIRES DATABASE CHECK**

**To Verify:** Run Query #1 from `DIAGNOSTIC_SQL.md`:

```sql
SELECT * 
FROM studio_memberships
WHERE studio_id = '<studioId>'
  AND user_id = '<userId>';
```

**Potential Issues:**

#### A. Owner Membership Not Created by Trigger
- **Location:** `supabase/migrations/003_studio_memberships.sql:31-44`
- **Trigger:** `handle_studio_owner_membership()` runs AFTER INSERT on studios
- **Check:** Query #4 from DIAGNOSTIC_SQL.md to verify all studios have owner memberships

**What to Look For:**
- Studios with `owner_id` but no matching membership row
- Trigger may have failed silently (ON CONFLICT DO NOTHING)

#### B. Invitation Acceptance Didn't Create Membership
- **Location:** `src/actions/acceptInvite.ts:136`
- **Check:** Query #7 from DIAGNOSTIC_SQL.md to verify invitations created memberships

**What to Look For:**
- Invitations with `accepted_at IS NOT NULL` but no membership row
- INSERT may have failed due to RLS policy blocking

#### C. Orphaned or Mismatched Rows
- **Check:** Query #8 from DIAGNOSTIC_SQL.md
- UUID format mismatches
- Email casing mismatches (invitations vs profiles)

**Diagnostic Logs to Check:**
- If row count (line 111) shows `rowCount: 0` AND database query shows row exists → **RLS is blocking**
- If row count shows `rowCount: 0` AND database query shows no row → **Row doesn't exist**

---

## 3. Cookie vs JWT Mismatch

### ⚠️ **POTENTIAL ISSUE - REQUIRES LOG VERIFICATION**

**Cookie Studio ID:**
- **Source:** `getCurrentStudioId()` reads `current_studio_id` cookie
- **Set by:** `setCurrentStudioId()` in various actions (createStudio, acceptInvite, switchStudio)

**RPC Context:**
- **Set by:** `serverClient.ts:74` calls `set_current_studio_id(studio_uuid: studioId)`
- **Read by:** `current_studio_id()` function in database

**What the Logs Should Show:**
```
[DIAG] Cookie studioId: 'abc-123-def'
[DIAG] current_studio_id() RPC returns: 'abc-123-def'
[DIAG] current_studio_id() matches cookie studioId: true  // ← Should be true
```

**Potential Issues:**

#### A. RPC Call Failed Silently
- **Location:** `serverClient.ts:74-90`
- **Issue:** RPC errors are only logged, not thrown
- **Check:** Look for `[DIAG] serverClient: set_current_studio_id RPC FAILED` in logs

**What to Look For:**
```
[DIAG] serverClient: set_current_studio_id RPC FAILED: {
  code: 'PGRST202',  // Function doesn't exist
  message: '...'
}
```

#### B. Cookie Not Set Before Query
- **Issue:** Cookie may be missing or wrong studio ID
- **Check:** `[DIAG] Cookie studioId: null` or wrong UUID

#### C. RPC Context Not Persisting
- **Issue:** `current_studio_id()` returns NULL even after RPC call
- **Check:** `[DIAG] current_studio_id() RPC returns: null`

**Diagnostic Logs to Check:**
- If cookie studioId ≠ current_studio_id() → RLS second condition fails
- If RPC failed → `current_studio_id()` returns NULL → RLS second condition fails

---

## 4. User ID vs auth.uid() Mismatch

### ⚠️ **POTENTIAL ISSUE - REQUIRES LOG VERIFICATION**

**JWT User ID:**
- **Source:** `supabase.auth.getUser()` returns `user.id`
- **Used in query:** `.eq('user_id', user.id)`

**RLS auth.uid():**
- **Source:** PostgreSQL `auth.uid()` function
- **Used in policy:** `user_id = auth.uid()` (line 15 of RLS policy)

**What the Logs Should Show:**
```
[DIAG] JWT user.id: 'user-123-abc'
[DIAG] auth.uid() verification (via profiles query): {
  profileFound: true,
  profileId: 'user-123-abc',
  authUidMatchesUserId: true  // ← Should be true
}
```

**Potential Issues:**

#### A. Session Not Set Correctly
- **Location:** `serverClient.ts:57-67`
- **Issue:** `setSession()` may fail silently
- **Check:** Look for `Failed to set session in Supabase client` warnings

#### B. auth.uid() Returns NULL
- **Issue:** JWT not properly decoded in RLS context
- **Result:** `user_id = auth.uid()` condition fails (NULL = NULL is false)

**Diagnostic Logs to Check:**
- If `authUidMatchesUserId: false` → RLS first condition fails
- If profile query fails → Session/auth not set correctly

---

## 5. Does RLS Return 0 Rows or Block the Row?

### ⚠️ **CRITICAL DISTINCTION - REQUIRES LOG ANALYSIS**

**RLS Policy Analysis:**

```sql
USING (
  user_id = auth.uid()  -- Condition 1
  OR (
    studio_id = current_studio_id()  -- Condition 2a
    AND is_studio_member(current_studio_id())  -- Condition 2b
  )
);
```

**The Query Filters:**
```typescript
.eq('studio_id', studioId)  // Filter: studio_id = cookie value
.eq('user_id', user.id)     // Filter: user_id = JWT user.id
```

**How RLS Works:**
1. Query applies filters: `studio_id = X AND user_id = Y`
2. RLS policy checks: Does row match USING clause?
3. If row exists but RLS blocks it → **Row disappears from result** (not an error, just 0 rows)
4. If row doesn't exist → **0 rows** (not an error, just 0 rows)
5. If 0 rows + `.single()` → **406 PGRST116** (this is the error)

**What the Logs Should Show:**

#### Scenario A: Row Doesn't Exist
```
[DIAG] Row count query result: {
  rowCount: 0,
  exactCount: 0,
  error: 'none'  // ← No error, just 0 rows
}
```
**Conclusion:** Membership row doesn't exist in database

#### Scenario B: RLS Blocks the Row
```
[DIAG] Row count query result: {
  rowCount: 0,
  exactCount: 0,
  error: 'none'  // ← No error, RLS silently filtered it out
}
```
**But database query (bypassing RLS) shows row exists:**
```sql
SELECT * FROM studio_memberships WHERE studio_id = 'X' AND user_id = 'Y';
-- Returns 1 row
```
**Conclusion:** RLS is blocking the row

**Why RLS Might Block:**

1. **Condition 1 fails:** `user_id = auth.uid()` is false
   - Check: `authUidMatchesUserId: false` in logs

2. **Condition 2a fails:** `studio_id = current_studio_id()` is false
   - Check: `current_studio_id() matches cookie studioId: false` in logs

3. **Condition 2b fails:** `is_studio_member(current_studio_id())` returns false
   - **Potential recursion issue:** `is_studio_member()` queries `studio_memberships` inside RLS policy
   - **Location:** `006_utils_current_studio.sql:24-33`
   - **Issue:** Function uses `SECURITY DEFINER` but may still be affected by RLS

**Diagnostic Logs to Check:**
- Row count = 0 + Database has row → **RLS blocking**
- Row count = 0 + Database has no row → **Row doesn't exist**
- Row count > 0 → **RLS working, but `.single()` still fails** (unlikely but possible)

---

## 6. Which DIAG Logs Confirm the Issue?

### Log Sequence to Analyze:

```
1. [DIAG] getMembership() called
2. [DIAG] Cookie studioId: '<uuid>' or null
3. [DIAG] JWT user.id: '<uuid>'
4. [DIAG] serverClient: set_current_studio_id RPC SUCCESS/FAILED
5. [DIAG] current_studio_id() RPC returns: '<uuid>' or null
6. [DIAG] current_studio_id() matches cookie studioId: true/false
7. [DIAG] auth.uid() verification: { authUidMatchesUserId: true/false }
8. [DIAG] Row count query result: { rowCount: 0 or 1, exactCount: 0 or 1 }
9. [DIAG] Query params: { studio_id: '<uuid>', user_id: '<uuid>' }
10. [DIAG] Query result: { errorCode: 'PGRST116', errorMessage: '...' }
```

### Key Diagnostic Indicators:

#### If `.single()` is the cause:
- ✅ Row count = 0
- ✅ Error code = 'PGRST116'
- ✅ Error message = "The result contains 0 rows"

#### If membership doesn't exist:
- ✅ Row count = 0
- ✅ Database query (bypassing RLS) returns 0 rows
- ✅ No RLS errors in logs

#### If RLS is blocking:
- ✅ Row count = 0
- ✅ Database query (bypassing RLS) returns 1 row
- ✅ One of these is false:
  - `current_studio_id() matches cookie studioId`
  - `authUidMatchesUserId`

#### If ID mismatch:
- ✅ `current_studio_id() matches cookie studioId: false`
- ✅ OR `authUidMatchesUserId: false`
- ✅ Row count = 0 (because query filters don't match)

---

## Recommended Next Steps

### Step 1: Run Application and Collect Logs
1. Trigger the error scenario
2. Collect all `[DIAG]` logs from console
3. Run Query #1 from `DIAGNOSTIC_SQL.md` with actual studioId/userId

### Step 2: Analyze Logs
Check these in order:
1. **Row count** (line 111) - Is it 0?
2. **Database query** - Does row exist when bypassing RLS?
3. **ID matches** - Do cookie/RPC/user IDs match?
4. **Error code** - Is it PGRST116?

### Step 3: Determine Root Cause
Based on logs:
- **If row count = 0 AND database has row** → RLS blocking (fix policy)
- **If row count = 0 AND database has no row** → Row doesn't exist (fix trigger/invitation)
- **If row count = 0 AND IDs don't match** → Fix cookie/auth session
- **If row count = 0 AND everything matches** → Change `.single()` to `.maybeSingle()`

### Step 4: Apply Fix
Only after identifying root cause:
- **If `.single()` issue:** Change to `.maybeSingle()` in `getMembership()`
- **If RLS issue:** Modify policy in `016_reset_memberships_rls.sql`
- **If membership missing:** Fix trigger or invitation acceptance
- **If ID mismatch:** Fix cookie/auth session handling

---

## Summary Table

| Issue | Probability | Evidence Needed | Fix |
|-------|------------|-----------------|-----|
| `.single()` with 0 rows | **HIGH** | Row count = 0 in logs | Change to `.maybeSingle()` |
| Membership row missing | **MEDIUM** | Database query returns 0 rows | Fix trigger/invitation |
| RLS blocking row | **MEDIUM** | Row count = 0 but DB has row | Fix RLS policy |
| Cookie/RPC mismatch | **LOW** | `current_studio_id() matches: false` | Fix RPC call |
| auth.uid() mismatch | **LOW** | `authUidMatchesUserId: false` | Fix session |

---

## Critical Questions to Answer from Logs

1. **Does row count show 0?** → If yes, `.single()` will cause 406
2. **Does database query (bypassing RLS) return a row?** → If no, row doesn't exist
3. **Do cookie and RPC studio IDs match?** → If no, RLS condition 2a fails
4. **Does auth.uid() match user.id?** → If no, RLS condition 1 fails
5. **Is `is_studio_member()` causing recursion?** → Check database logs for recursion warnings

**Once these are answered, we can determine the exact fix needed.**

