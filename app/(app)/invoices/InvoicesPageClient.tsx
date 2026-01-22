'use client'

import { Button } from '@/components/ui/button'

type PlaceholderInvoice = {
  id: string
  invoiceNumber: string
  clientName: string
  issueDate: string
  dueDate: string
  total: string
  status: 'draft' | 'issued' | 'paid'
}

const placeholderInvoices: PlaceholderInvoice[] = [
  {
    id: 'placeholder-1',
    invoiceNumber: 'INV-1001',
    clientName: 'Marigold Records',
    issueDate: 'Jan 12, 2026',
    dueDate: 'Jan 26, 2026',
    total: '$1,200.00',
    status: 'issued',
  },
  {
    id: 'placeholder-2',
    invoiceNumber: 'INV-1000',
    clientName: 'Daybreak Collective',
    issueDate: 'Jan 02, 2026',
    dueDate: 'Jan 16, 2026',
    total: '$850.00',
    status: 'paid',
  },
]

export function InvoicesPageClient() {

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Placeholder list while invoices are being rebuilt.
          </p>
        </div>
        <Button disabled>New invoice</Button>
      </div>

      <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Invoice data is temporarily offline while the tables are being reset.
      </div>

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
            {placeholderInvoices.map((invoice) => (
              <tr key={invoice.id} className="transition hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                <td className="px-4 py-3">{invoice.clientName}</td>
                <td className="px-4 py-3 text-muted-foreground">{invoice.issueDate}</td>
                <td className="px-4 py-3 text-muted-foreground">{invoice.dueDate}</td>
                <td className="px-4 py-3 font-medium">{invoice.total}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={invoice.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: PlaceholderInvoice['status'] }) {
  const label = status === 'draft' ? 'Draft' : status === 'paid' ? 'Paid' : 'Issued'

  const color =
    status === 'paid'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'draft'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-blue-100 text-blue-700'

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{label}</span>
}
