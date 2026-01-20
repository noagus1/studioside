/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  saveInvoice,
  sendInvoice,
  updateInvoiceStatus,
  createInvoicePaymentLink,
  goToInvoicePayment,
} from './actions'
import type { Client } from '../sessions/actions'
import type { InvoiceWithItems, InvoiceItemInput } from '@/types/invoice'
import type { InvoiceStatus } from '@/types/db'

interface Props {
  invoice: InvoiceWithItems
  clients: Client[]
}

export function InvoiceDetailClient({ invoice: initialInvoice, clients }: Props) {
  const [invoice, setInvoice] = useState(initialInvoice)
  const [items, setItems] = useState<InvoiceItemInput[]>(
    initialInvoice.items.length > 0
      ? initialInvoice.items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description || '',
          quantity: item.quantity,
          unit_amount: item.unit_amount,
          tax_rate: item.tax_rate,
          discount_amount: item.discount_amount,
          sort_order: item.sort_order,
        }))
      : [
          {
            name: '',
            quantity: 1,
            unit_amount: 0,
            tax_rate: 0,
            discount_amount: 0,
          },
        ]
  )
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const totals = useMemo(() => calculateTotals(items), [items])
  const isDraft = invoice.status === 'draft'

  useEffect(() => {
    setInvoice(initialInvoice)
  }, [initialInvoice])

  const handleItemChange = (index: number, field: keyof InvoiceItemInput, value: string) => {
    if (!isDraft) return
    setItems((prev) => {
      const copy = [...prev]
      copy[index] = {
        ...copy[index],
        [field]:
          field === 'name' || field === 'description'
            ? value
            : Number(value) || 0,
      }
      return copy
    })
  }

  const addItem = () => {
    if (!isDraft) return
    setItems((prev) => [
      ...prev,
      {
        name: '',
        quantity: 1,
        unit_amount: 0,
        tax_rate: 0,
        discount_amount: 0,
      },
    ])
  }

  const removeItem = (index: number) => {
    if (!isDraft) return
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const handleSave = () => {
    setMessage(null)
    setError(null)

    startTransition(async () => {
      const payload = {
        id: invoice.id,
        client_id: invoice.client_id,
        customer_email: invoice.customer_email,
        customer_name: invoice.customer_name,
        memo: invoice.memo,
        notes: invoice.notes,
        currency: invoice.currency,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        status: invoice.status,
        items,
      }

      const result = await saveInvoice(payload)

      if ('error' in result) {
        setError(result.message)
        return
      }

      setInvoice(result.invoice)
      setItems(
        result.invoice.items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description || '',
          quantity: item.quantity,
          unit_amount: item.unit_amount,
          tax_rate: item.tax_rate,
          discount_amount: item.discount_amount,
          sort_order: item.sort_order,
        }))
      )
      setMessage('Invoice updated')
    })
  }

  const handleSend = () => {
    setMessage(null)
    setError(null)
    startTransition(async () => {
      const result = await sendInvoice(invoice.id)
      if ('error' in result) {
        setError(result.message)
        return
      }
      setInvoice(result.invoice)
      setMessage('Invoice sent')
    })
  }

  const handleMarkPaid = () => {
    setMessage(null)
    setError(null)
    startTransition(async () => {
      const result = await updateInvoiceStatus(invoice.id, 'paid')
      if ('error' in result) {
        setError(result.message)
        return
      }
      setInvoice(result.invoice)
      setMessage('Invoice marked paid')
    })
  }

  const handlePaymentLink = () => {
    setMessage(null)
    setError(null)
    startTransition(async () => {
      const result = await createInvoicePaymentLink(invoice.id)
      if ('error' in result) {
        setError(result.message)
        return
      }
      setInvoice(result.invoice)
      setMessage('Payment link ready')
    })
  }

  const handlePayNow = () => {
    startTransition(async () => {
      try {
        await goToInvoicePayment(invoice.id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to open payment link')
      }
    })
  }

  return (
    <div className="space-y-6">
      <Link href="/invoices" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <span aria-hidden>←</span>
        Invoices
      </Link>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Invoice {invoice.invoice_number}</h1>
            <StatusPill status={invoice.status} />
          </div>
          <p className="text-muted-foreground">
            {invoice.customer_name || 'Client'} {invoice.customer_email ? `• ${invoice.customer_email}` : ''}
          </p>
          {!isDraft && (
            <p className="text-sm text-muted-foreground">This invoice has been issued. Editing is disabled.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePaymentLink} disabled={isPending}>
            {invoice.payment_link_url ? 'Refresh link' : 'Create payment link'}
          </Button>
          <Button variant="outline" onClick={handleSend} disabled={isPending}>
            Send
          </Button>
          <Button variant="secondary" onClick={handlePayNow} disabled={isPending || !invoice.payment_link_url}>
            Pay
          </Button>
          <Button onClick={handleMarkPaid} disabled={isPending}>
            Mark paid
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <Card className="border shadow-none">
          <CardHeader>
            <CardTitle>Invoice details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Client</label>
                <Select
                  disabled={!isDraft}
                  value={invoice.client_id ?? ''}
                  onValueChange={(val) => {
                    const client = clients.find((c) => c.id === val)
                    setInvoice((prev) => ({
                      ...prev,
                      client_id: val || null,
                      customer_name: client?.name ?? prev.customer_name,
                    }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Customer email</label>
                <Input
                  type="email"
                  readOnly={!isDraft}
                  value={invoice.customer_email || ''}
                  onChange={(e) => setInvoice((prev) => ({ ...prev, customer_email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Issue date</label>
                <Input
                  type="date"
                  disabled={!isDraft}
                  value={invoice.issue_date || ''}
                  onChange={(e) => setInvoice((prev) => ({ ...prev, issue_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due date</label>
                <Input
                  type="date"
                  disabled={!isDraft}
                  value={invoice.due_date || ''}
                  onChange={(e) => setInvoice((prev) => ({ ...prev, due_date: e.target.value || null }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Memo</label>
              <Textarea
                readOnly={!isDraft}
                value={invoice.memo || ''}
                onChange={(e) => setInvoice((prev) => ({ ...prev, memo: e.target.value }))}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Line items</h3>
                <Button variant="outline" size="sm" onClick={addItem} disabled={!isDraft}>
                  Add item
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <Card key={item.id || index} className="border shadow-none">
                    <CardContent className="p-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          placeholder="Name"
                          readOnly={!isDraft}
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        />
                        <Input
                          placeholder="Description (optional)"
                          readOnly={!isDraft}
                          value={item.description || ''}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-4">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Quantity"
                          readOnly={!isDraft}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        />
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Unit price"
                          readOnly={!isDraft}
                          value={item.unit_amount}
                          onChange={(e) => handleItemChange(index, 'unit_amount', e.target.value)}
                        />
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Tax %"
                          readOnly={!isDraft}
                          value={item.tax_rate}
                          onChange={(e) => handleItemChange(index, 'tax_rate', e.target.value)}
                        />
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Discount"
                          readOnly={!isDraft}
                          value={item.discount_amount}
                          onChange={(e) => handleItemChange(index, 'discount_amount', e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!isDraft || items.length === 1}
                          onClick={() => removeItem(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isDraft ? (
                <Button onClick={handleSave} disabled={isPending}>
                  {isPending ? 'Saving…' : 'Save changes'}
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">Issued invoices are read-only.</span>
              )}
              {invoice.pdf_url && (
                <Link href={invoice.pdf_url} target="_blank" rel="noreferrer">
                  <Button variant="outline">Download PDF</Button>
                </Link>
              )}
              {message && <span className="text-sm text-green-600">{message}</span>}
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-none">
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Subtotal" value={formatCurrency(totals.subtotal, invoice.currency)} />
            <Row label="Tax" value={formatCurrency(totals.tax_total, invoice.currency)} />
            {totals.discount_total > 0 && (
              <Row label="Discounts" value={`-${formatCurrency(totals.discount_total, invoice.currency)}`} />
            )}
            <Row
              label="Total"
              value={formatCurrency(totals.total, invoice.currency)}
              className="font-semibold text-base"
            />
            <Row label="Status" value={getStatusLabel(invoice.status)} />
            <Row label="Due date" value={invoice.due_date || 'N/A'} />
            {invoice.payment_link_url && (
              <Row
                label="Payment link"
                value={
                  <a className="text-blue-600 underline" href={invoice.payment_link_url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                }
              />
            )}
            {invoice.sent_at && <Row label="Sent" value={new Date(invoice.sent_at).toLocaleString()} />}
            {invoice.paid_at && <Row label="Paid" value={new Date(invoice.paid_at).toLocaleString()} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: InvoiceStatus }) {
  const label = getStatusLabel(status)
  const color =
    status === 'paid'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'sent'
      ? 'bg-blue-100 text-blue-700'
      : status === 'overdue'
      ? 'bg-red-100 text-red-700'
      : status === 'void'
      ? 'bg-gray-200 text-gray-700'
      : 'bg-amber-100 text-amber-700'

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${color}`}>
      {label}
    </span>
  )
}

function Row({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={className}>{value}</span>
    </div>
  )
}

function getStatusLabel(status: InvoiceStatus) {
  if (status === 'draft') return 'Draft'
  if (status === 'paid') return 'Paid'
  if (status === 'void') return 'Void'
  return 'Issued'
}

function calculateTotals(items: InvoiceItemInput[]) {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_amount || 0), 0)
  const tax_total = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_amount || 0) * ((item.tax_rate || 0) / 100),
    0
  )
  const discount_total = items.reduce((sum, item) => sum + (item.discount_amount || 0), 0)
  const total = Math.max(0, subtotal + tax_total - discount_total)

  return {
    subtotal: round(subtotal),
    tax_total: round(tax_total),
    discount_total: round(discount_total),
    total: round(total),
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100
}

function formatCurrency(amount: number, currency = 'usd') {
  return `${currency?.toUpperCase() || 'USD'} ${amount.toFixed(2)}`
}
