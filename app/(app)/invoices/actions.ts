/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import type { InvoiceInput, InvoiceListItem, InvoiceWithItems } from '@/types/invoice'

type InvoiceActionError = {
  error:
    | 'AUTHENTICATION_REQUIRED'
    | 'NO_STUDIO'
    | 'NOT_A_MEMBER'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'NOT_FOUND'
    | 'VALIDATION_ERROR'
    | 'DATABASE_ERROR'
  message: string
}

type GetInvoicesResult = { success: true; invoices: InvoiceListItem[] }
type GetInvoiceResult = { success: true; invoice: InvoiceWithItems }
type SaveInvoiceResult = { success: true; invoice: InvoiceWithItems }
type CreateInvoiceResult = { success: true; invoiceId: string }

interface ContextSuccess {
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>
  studioId: string
  userId: string
  isAdmin: boolean
}

type ContextResult = ContextSuccess | InvoiceActionError

async function getContext(requireAdmin = false): Promise<ContextResult> {
  const supabase = await getSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to access invoices',
    }
  }

  const studioId = await getCurrentStudioId()
  if (!studioId) {
    return {
      error: 'NO_STUDIO',
      message: 'No studio selected',
    }
  }

  // Set current studio context for RLS
  try {
    await supabase.rpc('set_current_studio_id', { studio_uuid: studioId })
  } catch (err) {
    console.warn('Failed to set current_studio_id for invoices', err)
  }

  const { data: membership } = await supabase
    .from('studio_users')
    .select('role')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return {
      error: 'NOT_A_MEMBER',
      message: 'You are not a member of this studio',
    }
  }

  const isAdmin = membership.role === 'owner' || membership.role === 'admin'
  if (requireAdmin && !isAdmin) {
    return {
      error: 'INSUFFICIENT_PERMISSIONS',
      message: 'Only admins or owners can manage invoices',
    }
  }

  return { supabase, studioId, userId: user.id, isAdmin }
}

export async function getInvoices(): Promise<GetInvoicesResult | InvoiceActionError> {
  const ctx = await getContext()
  if ('error' in ctx) return ctx

  const { supabase, studioId } = ctx
  const { data: invoiceData, error: invoiceError } = await supabase
    .from('invoice_master')
    .select(
      'id, studio_id, client_id, invoice_number, issue_date, due_date, currency, memo, notes, customer_name, customer_email, payment_link_url, pdf_url, stripe_payment_intent_id, stripe_checkout_session_id, issued_at, paid_at, created_by, created_at, updated_at, client:clients(name), invoice_details(total_cents)'
    )
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false })

  if (invoiceError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch invoices: ${invoiceError.message}`,
    }
  }

  const invoices: InvoiceListItem[] = (invoiceData || []).map((row: any) => {
    const totalCents = (row.invoice_details || []).reduce(
      (acc: number, detail: any) => acc + Number(detail.total_cents ?? 0),
      0
    )
    const total = totalCents / 100

    return {
      id: row.id,
      studio_id: row.studio_id,
      client_id: row.client_id,
      invoice_number: row.invoice_number,
      issue_date: row.issue_date,
      due_date: row.due_date,
      currency: row.currency || 'usd',
      memo: row.memo ?? null,
      notes: row.notes ?? null,
      payment_link_url: row.payment_link_url ?? null,
      pdf_url: row.pdf_url ?? null,
      stripe_payment_intent_id: row.stripe_payment_intent_id ?? null,
      stripe_checkout_session_id: row.stripe_checkout_session_id ?? null,
      customer_name: row.customer_name ?? null,
      customer_email: row.customer_email ?? null,
      issued_at: row.issued_at ?? null,
      paid_at: row.paid_at ?? null,
      created_by: row.created_by ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at ?? row.created_at,
      client_name: row.customer_name ?? row.client?.name ?? null,
      status: getLifecycleStatus(row),
      subtotal: total,
      total,
    }
  })

  return { success: true, invoices }
}

export async function createDraftInvoice(): Promise<CreateInvoiceResult | InvoiceActionError> {
  const ctx = await getContext(true)
  if ('error' in ctx) return ctx

  const { supabase, studioId, userId } = ctx

  const issueDate = new Date().toISOString().slice(0, 10)
  const { data: nextNumber, error: numberError } = await supabase.rpc('next_invoice_number', {
    in_studio_id: studioId,
  })

  if (numberError || !nextNumber) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to generate invoice number: ${numberError?.message || 'Unknown error'}`,
    }
  }

  const { data, error } = await supabase
    .from('invoice_master')
    .insert({
      studio_id: studioId,
      client_id: null,
      invoice_number: nextNumber,
      period_start: issueDate,
      period_end: issueDate,
      issue_date: issueDate,
      due_date: null,
      currency: 'usd',
      issued_at: null,
      pdf_url: null,
      created_by: userId,
    })
    .select('id')
    .maybeSingle()

  if (error || !data) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to create invoice: ${error?.message || 'Unknown error'}`,
    }
  }

  return { success: true, invoiceId: data.id }
}

export async function getInvoiceById(invoiceId: string): Promise<GetInvoiceResult | InvoiceActionError> {
  const ctx = await getContext()
  if ('error' in ctx) return ctx

  const { supabase } = ctx
  return fetchInvoiceWithItems(supabase, invoiceId)
}

export async function saveInvoice(input: InvoiceInput): Promise<SaveInvoiceResult | InvoiceActionError> {
  const ctx = await getContext(true)
  if ('error' in ctx) return ctx

  const { supabase, studioId, userId } = ctx

  if (!input.items || input.items.length === 0) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'At least one line item is required',
    }
  }

  if (!input.client_id) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Select a client before saving the invoice',
    }
  }

  const issueDate = input.issue_date || new Date().toISOString().slice(0, 10)
  const dueDate = input.due_date ?? null
  const periodEnd = dueDate || issueDate
  const invoicePayload = {
    studio_id: studioId,
    client_id: input.client_id,
    customer_name: input.customer_name ?? null,
    customer_email: input.customer_email ?? null,
    memo: input.memo ?? null,
    notes: input.notes ?? null,
    currency: input.currency || 'usd',
    issue_date: issueDate,
    due_date: dueDate,
    period_start: issueDate,
    period_end: periodEnd,
    created_by: userId,
  }

  let invoiceId: string

  if (input.id) {
    invoiceId = input.id
    const { data: existing } = await supabase
      .from('invoice_master')
      .select('id, studio_id')
      .eq('id', invoiceId)
      .maybeSingle()

    if (!existing || existing.studio_id !== studioId) {
      return { error: 'NOT_FOUND', message: 'Invoice not found' }
    }

    const { error: updateError } = await supabase
      .from('invoice_master')
      .update(invoicePayload)
      .eq('id', invoiceId)

    if (updateError) {
      return {
        error: 'DATABASE_ERROR',
        message: `Failed to update invoice: ${updateError.message}`,
      }
    }

    await supabase.from('invoice_details').delete().eq('invoice_id', invoiceId)
  } else {
    const { data, error: insertError } = await supabase
      .from('invoice_master')
      .insert(invoicePayload)
      .select('id')
      .maybeSingle()

    if (insertError || !data) {
      return {
        error: 'DATABASE_ERROR',
        message: `Failed to create invoice: ${insertError?.message || 'Unknown error'}`,
      }
    }

    invoiceId = data.id
  }

  let toInvoiceStatusId: string
  try {
    ;({ toInvoiceStatusId } = await getInvoiceStatusIds(supabase))
  } catch (err) {
    return {
      error: 'DATABASE_ERROR',
      message: err instanceof Error ? err.message : 'Failed to load invoice statuses',
    }
  }
  const itemsPayload = input.items.map((item, index) => {
    const quantity = Number(item.quantity) || 0
    const unitAmount = Number(item.unit_amount) || 0
    const unitPriceCents = Math.round(unitAmount * 100)
    const totalCents = Math.round(quantity * unitAmount * 100)

    return {
      studio_id: studioId,
      client_id: input.client_id,
      invoice_id: invoiceId,
      description: item.name || 'Item',
      quantity,
      unit_price_cents: unitPriceCents,
      total_cents: totalCents,
      status_id: toInvoiceStatusId,
      service_date: issueDate,
      sort_order: item.sort_order ?? index,
    }
  })

  const { error: itemsError } = await supabase.from('invoice_details').insert(itemsPayload)
  if (itemsError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to save invoice items: ${itemsError.message}`,
    }
  }

  const invoiceResult = await fetchInvoiceWithItems(supabase, invoiceId)
  if ('error' in invoiceResult) return invoiceResult

  return { success: true, invoice: invoiceResult.invoice }
}

export async function sendInvoice(invoiceId: string): Promise<SaveInvoiceResult | InvoiceActionError> {
  const ctx = await getContext(true)
  if ('error' in ctx) return ctx

  const { supabase, studioId } = ctx

  let invoicedStatusId: string
  try {
    ;({ invoicedStatusId } = await getInvoiceStatusIds(supabase))
  } catch (err) {
    return {
      error: 'DATABASE_ERROR',
      message: err instanceof Error ? err.message : 'Failed to load invoice statuses',
    }
  }
  const { data, error } = await supabase
    .from('invoice_master')
    .update({ issued_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .eq('studio_id', studioId)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to send invoice: ${error?.message || 'Invoice not found'}`,
    }
  }

  const { error: detailError } = await supabase
    .from('invoice_details')
    .update({ status_id: invoicedStatusId })
    .eq('invoice_id', invoiceId)
    .eq('studio_id', studioId)

  if (detailError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to issue invoice items: ${detailError.message}`,
    }
  }

  const invoiceResult = await fetchInvoiceWithItems(supabase, invoiceId)
  if ('error' in invoiceResult) return invoiceResult

  return { success: true, invoice: invoiceResult.invoice }
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: 'paid'
): Promise<SaveInvoiceResult | InvoiceActionError> {
  const ctx = await getContext(true)
  if ('error' in ctx) return ctx

  const { supabase, studioId } = ctx

  if (status !== 'paid') {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Only paid status updates are supported in the reset invoice model.',
    }
  }

  const { data, error } = await supabase
    .from('invoice_master')
    .update({ paid_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .eq('studio_id', studioId)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to update invoice status: ${error?.message || 'Invoice not found'}`,
    }
  }

  const invoiceResult = await fetchInvoiceWithItems(supabase, invoiceId)
  if ('error' in invoiceResult) return invoiceResult

  return { success: true, invoice: invoiceResult.invoice }
}

async function fetchInvoiceWithItems(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  invoiceId: string
): Promise<GetInvoiceResult | InvoiceActionError> {
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoice_master')
    .select(
      'id, studio_id, client_id, invoice_number, issue_date, due_date, currency, memo, notes, customer_name, customer_email, payment_link_url, pdf_url, stripe_payment_intent_id, stripe_checkout_session_id, issued_at, paid_at, created_by, created_at, updated_at, invoice_details(id, description, quantity, unit_price_cents, total_cents, service_date, sort_order)'
    )
    .eq('id', invoiceId)
    .maybeSingle()

  if (invoiceError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch invoice: ${invoiceError.message}`,
    }
  }

  if (!invoice) {
    return { error: 'NOT_FOUND', message: 'Invoice not found' }
  }

  const details = (invoice as any).invoice_details || []
  const items = details
    .map((d: any, index: number) => ({
      id: d.id,
      name: d.description || 'Charge',
      quantity: Number(d.quantity ?? 0),
      unit_amount: Number(d.unit_price_cents ?? 0) / 100,
      sort_order: d.sort_order ?? index,
    }))
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const totalCents = details.reduce((acc: number, d: any) => acc + Number(d.total_cents ?? 0), 0)
  const total = totalCents / 100

  return {
    success: true,
    invoice: {
      ...(invoice as any),
      status: getLifecycleStatus(invoice),
      subtotal: total,
      total,
      items,
    },
  }
}

async function getInvoiceStatusIds(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>
): Promise<{ toInvoiceStatusId: string; invoicedStatusId: string }> {
  const { data, error } = await supabase
    .from('invoice_statuses')
    .select('id, name')

  if (error || !data) {
    throw new Error(error?.message || 'Failed to load invoice statuses')
  }

  const toInvoice = data.find((row) => row.name === 'to_invoice')
  const invoiced = data.find((row) => row.name === 'invoiced')

  if (!toInvoice || !invoiced) {
    throw new Error('Invoice statuses not seeded')
  }

  return { toInvoiceStatusId: toInvoice.id, invoicedStatusId: invoiced.id }
}

function getLifecycleStatus(invoice: { issued_at?: string | null; paid_at?: string | null }) {
  if (invoice.paid_at) return 'paid'
  if (invoice.issued_at) return 'sent'
  return 'draft'
}
