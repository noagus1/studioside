import { describe, expect, it } from 'vitest'
import {
  __test__computeAvailabilityWarnings,
  __test__normalizeResourceInputs,
  type SessionResourceInput,
} from '../actions'

describe('session resource helpers', () => {
  it('normalizes resource inputs', () => {
    const inputs: SessionResourceInput[] = [
      { gear_id: ' gear-1 ', quantity: 2, note: '  clean  ' },
      { gear_id: '  ', quantity: 3 },
      { gear_id: 'gear-2', quantity: 0 },
    ]

    const normalized = __test__normalizeResourceInputs(inputs)

    expect(normalized).toEqual([
      { gear_id: 'gear-1', quantity: 2, note: 'clean' },
      { gear_id: 'gear-2', quantity: 1, note: null },
    ])
  })

  it('computes availability warnings when request exceeds stock', () => {
    const resources = [
      { gear_id: 'g1', quantity: 3, note: null },
      { gear_id: 'g1', quantity: 2, note: null },
      { gear_id: 'g2', quantity: 1, note: null },
    ]

    const gearLookup = {
      g1: { quantity: 4 },
      g2: { quantity: 2 },
    }

    const warnings = __test__computeAvailabilityWarnings(resources, gearLookup)

    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatchObject({
      gear_id: 'g1',
      requested: 5,
      available: 4,
    })
  })

  it('returns no warnings when within stock', () => {
    const resources = [
      { gear_id: 'g1', quantity: 1, note: null },
      { gear_id: 'g2', quantity: 2, note: null },
    ]

    const gearLookup = {
      g1: { quantity: 2 },
      g2: { quantity: 2 },
    }

    const warnings = __test__computeAvailabilityWarnings(resources, gearLookup)

    expect(warnings).toHaveLength(0)
  })
})

