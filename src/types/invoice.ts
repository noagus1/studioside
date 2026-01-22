/**
 * Invoice Types
 * 
 * Shared invoice interfaces for server actions and UI.
 */

import type { InvoiceMaster } from './db'

export type InvoiceLifecycleStatus = 'draft' | 'sent' | 'paid'

export interface InvoiceItem {
  id: string
  name: string
  quantity: number
  unit_amount: number
  sort_order: number
}

export interface InvoiceWithItems extends InvoiceMaster {
  items: InvoiceItem[]
  status: InvoiceLifecycleStatus
  subtotal: number
  total: number
}

export interface InvoiceListItem extends InvoiceMaster {
  client_name: string | null
  status: InvoiceLifecycleStatus
  subtotal: number
  total: number
}

export interface InvoiceItemInput {
  id?: string
  name: string
  quantity: number
  unit_amount: number
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
}



