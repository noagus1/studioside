import { describe, expect, it } from 'vitest'
import { calculateInvoiceTotals } from '../src/lib/invoices/calculateTotals'

describe('calculateInvoiceTotals', () => {
  it('calculates subtotal, tax, discount, and total', () => {
    const totals = calculateInvoiceTotals([
      { name: 'Mix', quantity: 2, unit_amount: 150, tax_rate: 10, discount_amount: 0 },
      { name: 'Master', quantity: 1, unit_amount: 200, tax_rate: 0, discount_amount: 25 },
    ])

    expect(totals.subtotal).toBe(500)
    expect(totals.tax_total).toBe(30)
    expect(totals.discount_total).toBe(25)
    expect(totals.total).toBe(505)
  })

  it('does not allow negative totals', () => {
    const totals = calculateInvoiceTotals([
      { name: 'Credit', quantity: 1, unit_amount: 100, tax_rate: 0, discount_amount: 150 },
    ])

    expect(totals.total).toBe(0)
  })
})



