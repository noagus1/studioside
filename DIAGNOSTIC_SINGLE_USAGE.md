# Documentation: All .single() Usages in studio_memberships Queries

This document lists all locations where `.single()` is used with `studio_memberships` queries. These are potential sources of 406 PGRST116 errors when 0 rows are returned.

## Summary

**Total `.single()` usages found: 6**

All of these will return 406 PGRST116 if the query returns 0 rows (even if RLS is correct).

## Detailed List

### 1. `src/data/getMembership.ts:116` ⚠️ **PRIMARY SUSPECT**

**Query Pattern:**
```typescript
const { data, error } = await supabase
  .from('studio_memberships')
  .select('*')
  .eq('studio_id', studioId)
  .eq('user_id', user.id)
  .single()
```

**Purpose:** Get current user's membership for active studio

**Error Handling:** Already handles PGRST116 (line 129), but error still occurs before handling

**Risk Level:** HIGH - This is the most likely source of the reported error

**Recommendation:** Change to `.maybeSingle()` to return `null` instead of throwing 406

---

### 2. `src/actions/acceptInvite.ts:112`

**Query Pattern:**
```typescript
const { data: existingMembership } = await supabase
  .from('studio_memberships')
  .select('studio_id, role')
  .eq('studio_id', invitation.studio_id)
  .eq('user_id', user.id)
  .single()
```

**Purpose:** Check if user is already a member before accepting invitation

**Error Handling:** No explicit PGRST116 handling - will throw if membership doesn't exist

**Risk Level:** MEDIUM - Expected to return 0 rows if user isn't a member yet

**Recommendation:** Change to `.maybeSingle()` since 0 rows is an expected case

---

### 3. `src/actions/createStudioInvite.ts:103`

**Query Pattern:**
```typescript
const { data: membership } = await supabase
  .from('studio_memberships')
  .select('role')
  .eq('studio_id', studioId)
  .eq('user_id', user.id)
  .single()
```

**Purpose:** Verify user is a member before creating an invite

**Error Handling:** No explicit PGRST116 handling

**Risk Level:** MEDIUM - Should always return a row if user is a member

**Recommendation:** Keep `.single()` but add explicit error handling for PGRST116

---

### 4. `src/actions/revokeStudioInvite.ts:89`

**Query Pattern:**
```typescript
const { data: membership } = await supabase
  .from('studio_memberships')
  .select('role')
  .eq('studio_id', studioId)
  .eq('user_id', user.id)
  .single()
```

**Purpose:** Verify user is a member before revoking an invite

**Error Handling:** No explicit PGRST116 handling

**Risk Level:** MEDIUM - Should always return a row if user is a member

**Recommendation:** Keep `.single()` but add explicit error handling for PGRST116

---

### 5. `src/actions/removeStudioMember.ts:93`

**Query Pattern:**
```typescript
const { data: currentMembership } = await supabase
  .from('studio_memberships')
  .select('role')
  .eq('studio_id', studioId)
  .eq('user_id', user.id)
  .single()
```

**Purpose:** Get current user's membership to check permissions before removing a member

**Error Handling:** No explicit PGRST116 handling

**Risk Level:** MEDIUM - Should always return a row if user is a member

**Recommendation:** Keep `.single()` but add explicit error handling for PGRST116

---

### 6. `src/actions/removeStudioMember.ts:130`

**Query Pattern:**
```typescript
const { data: targetMembership, error: membershipCheckError } = await supabase
  .from('studio_memberships')
  .select('id, studio_id, user_id, role')
  .eq('id', memberId)
  .single()
```

**Purpose:** Get the membership being removed to validate it exists and check permissions

**Error Handling:** Checks `membershipCheckError` but doesn't specifically handle PGRST116

**Risk Level:** LOW - Should always return a row if memberId is valid

**Recommendation:** Keep `.single()` but add explicit error handling for PGRST116

---

## Query Patterns Without .single()

These queries use `studio_memberships` but don't use `.single()`, so they won't cause 406 errors:

### `src/data/getUserStudios.ts:62`
- Uses array query (no `.single()`)
- Filters by `user_id` only
- Returns multiple rows

### `src/actions/getTeamData.ts:81`
- Uses array query (no `.single()`)
- Filters by `studio_id` only
- Returns multiple rows

### `src/actions/acceptInvite.ts:136`
- INSERT query (no `.single()`)
- Creates new membership

---

## Recommendations

### Immediate Actions

1. **`getMembership()` (Primary Suspect)**: Change `.single()` to `.maybeSingle()`
   - This is the most likely source of the error
   - Already has error handling, but `.maybeSingle()` is cleaner

2. **`acceptInvite()`**: Change `.single()` to `.maybeSingle()`
   - 0 rows is an expected case (user not yet a member)
   - No need to throw error

### Future Improvements

3. **All other `.single()` usages**: Add explicit PGRST116 error handling
   - These should always return rows if user is a member
   - But graceful error handling is better than crashes

### Pattern to Follow

```typescript
// Instead of:
const { data, error } = await supabase
  .from('studio_memberships')
  .select('*')
  .eq('studio_id', studioId)
  .eq('user_id', user.id)
  .single()

// Use:
const { data, error } = await supabase
  .from('studio_memberships')
  .select('*')
  .eq('studio_id', studioId)
  .eq('user_id', user.id)
  .maybeSingle()  // Returns null instead of throwing 406

// Or if you need to throw:
if (error) {
  if (error.code === 'PGRST116') {
    // Handle "not found" case
    return null
  }
  throw new Error(`Failed to fetch membership: ${error.message}`)
}
```

---

## Testing Checklist

After making changes, test each location:

- [ ] `getMembership()` - Test with valid/invalid studioId
- [ ] `acceptInvite()` - Test when user is/not already a member
- [ ] `createStudioInvite()` - Test when user is/not a member
- [ ] `revokeStudioInvite()` - Test when user is/not a member
- [ ] `removeStudioMember()` - Test both queries with valid/invalid IDs

