/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { calculateInvoiceTotals } from '@/lib/invoices/calculateTotals'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import type { InvoiceStatus } from '@/types/db'
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
    .from('studio_memberships')
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
  const { data: draftData, error: draftError } = await supabase
    .from('invoice_drafts')
    .select('*, client:clients(name)')
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false })

  if (draftError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch drafts: ${draftError.message}`,
    }
  }

  const { data: issuedData, error: issuedError } = await supabase
    .from('invoice_master')
    .select(
      'id, studio_id, client_id, invoice_number, issued_at, created_at, pdf_url, created_by, client:clients(name), invoice_details(total_cents)'
    )
    .eq('studio_id', studioId)
    .order('issued_at', { ascending: false })

  if (issuedError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch issued invoices: ${issuedError.message}`,
    }
  }

  const drafts: InvoiceListItem[] = (draftData || []).map((row: any) => ({
    ...(row as any),
    client_name: row.customer_name ?? row.client?.name ?? null,
  }))

  const issued: InvoiceListItem[] = (issuedData || []).map((row: any) => {
    const totalCents = (row.invoice_details || []).reduce(
      (acc: number, detail: any) => acc + Number(detail.total_cents ?? 0),
      0
    )
    const total = totalCents / 100
    const issuedAt = row.issued_at || row.created_at

    return {
      id: row.id,
      studio_id: row.studio_id,
      client_id: row.client_id,
      invoice_number: row.invoice_number,
      status: 'sent',
      currency: 'usd',
      issue_date: issuedAt,
      due_date: null,
      subtotal: total,
      tax_total: 0,
      discount_total: 0,
      total,
      memo: null,
      notes: null,
      payment_link_url: null,
      pdf_url: row.pdf_url,
      stripe_payment_intent_id: null,
      stripe_checkout_session_id: null,
      metadata: {},
      customer_name: null,
      customer_email: null,
      sent_at: issuedAt,
      paid_at: null,
      created_by: row.created_by ?? null,
      created_at: row.created_at,
      updated_at: row.created_at,
      client_name: row.client?.name ?? null,
    }
  })

  const invoices = [...drafts, ...issued].sort((a, b) => {
    const dateA = new Date(a.created_at || a.issue_date || '').getTime()
    const dateB = new Date(b.created_at || b.issue_date || '').getTime()
    return dateB - dateA
  })

  return { success: true, invoices }
}

export async function createDraftInvoice(): Promise<CreateInvoiceResult | InvoiceActionError> {
  const ctx = await getContext(true)
  if ('error' in ctx) return ctx

  const { supabase, studioId, userId } = ctx

  const { data, error } = await supabase
    .from('invoice_drafts')
    .insert({
      studio_id: studioId,
      status: 'draft',
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: null,
      subtotal: 0,
      tax_total: 0,
      discount_total: 0,
      total: 0,
      currency: 'usd',
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

  const totals = calculateInvoiceTotals(input.items)

  const invoicePayload = {
    studio_id: studioId,
    client_id: input.client_id,
    customer_name: input.customer_name ?? null,
    customer_email: input.customer_email ?? null,
    memo: input.memo ?? null,
    notes: input.notes ?? null,
    currency: input.currency || 'usd',
    issue_date: input.issue_date || new Date().toISOString().slice(0, 10),
    due_date: input.due_date ?? null,
    status: input.status || 'draft',
    subtotal: totals.subtotal,
    tax_total: totals.tax_total,
    discount_total: totals.discount_total,
    total: totals.total,
    created_by: userId,
  }

  let invoiceId: string

  if (input.id) {
    invoiceId = input.id
    const { data: existing } = await supabase
      .from('invoice_drafts')
      .select('id, studio_id')
      .eq('id', invoiceId)
      .maybeSingle()

    if (!existing || existing.studio_id !== studioId) {
      return { error: 'NOT_FOUND', message: 'Invoice not found' }
    }

    const { error: updateError } = await supabase
      .from('invoice_drafts')
      .update(invoicePayload)
      .eq('id', invoiceId)

    if (updateError) {
      return {
        error: 'DATABASE_ERROR',
        message: `Failed to update invoice: ${updateError.message}`,
      }
    }

    await supabase.from('invoice_draft_items').delete().eq('invoice_id', invoiceId)
  } else {
    const { data, error: insertError } = await supabase
      .from('invoice_drafts')
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

  const itemsPayload = input.items.map((item, index) => ({
    invoice_id: invoiceId,
    name: item.name || 'Item',
    description: item.description || null,
    quantity: Number(item.quantity) || 0,
    unit_amount: Number(item.unit_amount) || 0,
    tax_rate: Number(item.tax_rate || 0),
    discount_amount: Number(item.discount_amount || 0),
    sort_order: item.sort_order ?? index,
  }))

  const { error: itemsError } = await supabase.from('invoice_draft_items').insert(itemsPayload)
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

  const { data, error } = await supabase
    .from('invoice_drafts')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
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

  const invoiceResult = await fetchInvoiceWithItems(supabase, invoiceId)
  if ('error' in invoiceResult) return invoiceResult

  return { success: true, invoice: invoiceResult.invoice }
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus
): Promise<SaveInvoiceResult | InvoiceActionError> {
  const ctx = await getContext(true)
  if ('error' in ctx) return ctx

  const { supabase, studioId } = ctx

  const updates: Record<string, any> = { status }
  if (status === 'paid') {
    updates.paid_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('invoice_drafts')
    .update(updates)
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

export async function createInvoicePaymentLink(
  invoiceId: string
): Promise<SaveInvoiceResult | InvoiceActionError> {
  return {
    error: 'DATABASE_ERROR',
    message: 'Payment link generation is not available for the new invoice model.',
  }
}

export async function goToInvoicePayment(invoiceId: string): Promise<void> {
  throw new Error('Invoice payment links are not available in the new invoice model.')
}

async function fetchInvoiceWithItems(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  invoiceId: string
): Promise<GetInvoiceResult | InvoiceActionError> {
  const { data: draft, error: draftError } = await supabase
    .from('invoice_drafts')
    .select('*, invoice_draft_items(*), client:clients(name)')
    .eq('id', invoiceId)
    .maybeSingle()

  if (draftError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch invoice: ${draftError.message}`,
    }
  }

  if (draft) {
    const items = ((draft as any).invoice_draft_items || []).sort(
      (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    )

    return {
      success: true,
      invoice: {
        ...(draft as any),
        client_name: (draft as any).customer_name ?? (draft as any).client?.name ?? null,
        items,
      },
    }
  }

  const { data: issued, error: issuedError } = await supabase
    .from('invoice_master')
    .select(
      'id, studio_id, client_id, invoice_number, issued_at, created_at, pdf_url, created_by, client:clients(name), invoice_details(id, description, quantity, unit_price_cents, total_cents, service_date)'
    )
    .eq('id', invoiceId)
    .maybeSingle()

  if (issuedError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch invoice: ${issuedError.message}`,
    }
  }

  if (!issued) {
    return { error: 'NOT_FOUND', message: 'Invoice not found' }
  }

  const details = (issued as any).invoice_details || []
  const items = details
    .map((d: any, index: number) => ({
      id: d.id,
      name: d.description || 'Charge',
      description: d.description || null,
      quantity: Number(d.quantity ?? 0),
      unit_amount: Number(d.unit_price_cents ?? 0) / 100,
      tax_rate: 0,
      discount_amount: 0,
      sort_order: index,
      service_date: d.service_date,
      total_cents: d.total_cents,
    }))
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const totalCents = details.reduce((acc: number, d: any) => acc + Number(d.total_cents ?? 0), 0)
  const total = totalCents / 100
  const issuedAt = (issued as any).issued_at || (issued as any).created_at

  return {
    success: true,
    invoice: {
      ...(issued as any),
      status: 'sent',
      currency: 'usd',
      issue_date: issuedAt,
      due_date: null,
      subtotal: total,
      tax_total: 0,
      discount_total: 0,
      total,
      payment_link_url: null,
      customer_name: null,
      customer_email: null,
      sent_at: issuedAt,
      paid_at: null,
      updated_at: (issued as any).created_at,
      client_name: (issued as any).client?.name ?? null,
      items,
    },
  }
}
