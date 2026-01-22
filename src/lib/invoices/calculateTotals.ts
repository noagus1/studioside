/**
 * Pure invoice total calculator used by server actions and tests.
 */

import type { InvoiceItemInput } from '../../types/invoice'

export function calculateInvoiceTotals(items: InvoiceItemInput[]) {
  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0
    const unit = Number(item.unit_amount) || 0
    return sum + qty * unit
  }, 0)
  const total = Math.max(0, subtotal)

  return {
    subtotal: roundCurrency(subtotal),
    total: roundCurrency(total),
  }
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}



