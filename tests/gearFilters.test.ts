import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/serverClient', () => ({
  getSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/cookies/currentStudio', () => ({
  getCurrentStudioId: vi.fn(),
}))

import { applyFiltersToQuery } from '../app/(app)/gear/queryUtils'
import type { GearFilters } from '../app/(app)/gear/actions'

function createMockQuery() {
  const calls = {
    in: [] as Array<[string, any[]]>,
    not: [] as Array<[string, string, any]>,
    is: [] as Array<[string, any]>,
    or: [] as string[],
  }

  const query = {
    calls,
    in(column: string, values: any[]) {
      calls.in.push([column, values])
      return query
    },
    not(column: string, operator: string, value: any) {
      calls.not.push([column, operator, value])
      return query
    },
    is(column: string, value: any) {
      calls.is.push([column, value])
      return query
    },
    or(expression: string) {
      calls.or.push(expression)
      return query
    },
  }

  return query
}

describe('applyFiltersToQuery', () => {
  it('uses type_id when types are provided', async () => {
    const query = createMockQuery()
    const filters: GearFilters = { types: ['type-1', 'type-2'] }

    await applyFiltersToQuery(query as any, filters)

    expect(query.calls.in).toEqual([['type_id', ['type-1', 'type-2']]])
  })

  it('does not apply type filter when types are empty', async () => {
    const query = createMockQuery()
    const filters: GearFilters = { types: [] }

    await applyFiltersToQuery(query as any, filters)

    expect(query.calls.in).toEqual([])
  })
})



