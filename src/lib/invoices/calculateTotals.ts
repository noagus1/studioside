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

  const tax_total = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0
    const unit = Number(item.unit_amount) || 0
    const rate = Number(item.tax_rate || 0)
    return sum + qty * unit * (rate / 100)
  }, 0)

  const discount_total = items.reduce((sum, item) => {
    const discount = Number(item.discount_amount || 0)
    return sum + discount
  }, 0)

  const total = Math.max(0, subtotal + tax_total - discount_total)

  return {
    subtotal: roundCurrency(subtotal),
    tax_total: roundCurrency(tax_total),
    discount_total: roundCurrency(discount_total),
    total: roundCurrency(total),
  }
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}



