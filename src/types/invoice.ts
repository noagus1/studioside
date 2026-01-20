/**
 * Invoice Types
 * 
 * Shared invoice interfaces for server actions and UI.
 */

import type { Invoice, InvoiceItem, InvoiceStatus, Timestamp } from './db'

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[]
}

export interface InvoiceListItem extends Invoice {
  client_name: string | null
}

export interface InvoiceItemInput {
  id?: string
  name: string
  description?: string | null
  quantity: number
  unit_amount: number
  tax_rate?: number
  discount_amount?: number
  sort_order?: number
}

export interface InvoiceInput {
  id?: string
  client_id: string | null
  customer_name?: string | null
  customer_email?: string | null
  memo?: string | null
  notes?: string | null
  currency?: string
  issue_date?: string
  due_date?: string | null
  items: InvoiceItemInput[]
  tax_total?: number
  discount_total?: number
  status?: InvoiceStatus
}

export interface InvoiceStatusHistoryEntry {
  status: InvoiceStatus
  changed_at: Timestamp
  changed_by?: string | null
}



