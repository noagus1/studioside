'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createDraftInvoice } from './actions'
import type { InvoiceStatus } from '@/types/db'
import type { InvoiceListItem } from '@/types/invoice'

interface Props {
  invoices: InvoiceListItem[]
}

export function InvoicesPageClient({ invoices }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleNewInvoice = () => {
    setError(null)
    startTransition(async () => {
      const result = await createDraftInvoice()
      if ('error' in result) {
        if (result.error === 'AUTHENTICATION_REQUIRED') {
          router.push('/login')
          return
        }
        setError(result.message)
        return
      }

      router.push(`/invoices/${result.invoiceId}`)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground">All invoices for this studio, in one place.</p>
        </div>
        <Button onClick={handleNewInvoice} disabled={isPending}>
          {isPending ? 'Creating…' : 'New invoice'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Invoice #</th>
              <th className="px-4 py-3 text-left font-medium">Client</th>
              <th className="px-4 py-3 text-left font-medium">Issue date</th>
              <th className="px-4 py-3 text-left font-medium">Due date</th>
              <th className="px-4 py-3 text-left font-medium">Total</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={6}>
                  No invoices yet. Create your first one to get started.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="cursor-pointer transition hover:bg-muted/50"
                  onClick={() => router.push(`/invoices/${invoice.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{invoice.invoice_number}</td>
                  <td className="px-4 py-3">{invoice.client_name || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(invoice.issue_date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(invoice.due_date)}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(invoice.total, invoice.currency)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={invoice.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const label =
    status === 'draft'
      ? 'Draft'
      : status === 'paid'
      ? 'Paid'
      : status === 'void'
      ? 'Void'
      : 'Issued'

  const color =
    status === 'paid'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'draft'
      ? 'bg-amber-100 text-amber-800'
      : status === 'void'
      ? 'bg-gray-200 text-gray-700'
      : 'bg-blue-100 text-blue-700'

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{label}</span>
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—'
  const parsed = new Date(dateString)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed)
}

function formatCurrency(amount: number, currency = 'usd') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount ?? 0)
  } catch {
    return `${currency?.toUpperCase() || 'USD'} ${Number(amount ?? 0).toFixed(2)}`
  }
}
