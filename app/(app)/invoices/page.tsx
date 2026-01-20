import { redirect } from 'next/navigation'
import { InvoicesPageClient } from './InvoicesPageClient'
import { getInvoices } from './actions'

export default async function InvoicesPage() {
  const invoicesResult = await getInvoices()

  if ('error' in invoicesResult) {
    if (invoicesResult.error === 'AUTHENTICATION_REQUIRED') {
      redirect('/login')
    }
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-red-600">{invoicesResult.message}</p>
      </div>
    )
  }

  return <InvoicesPageClient invoices={invoicesResult.invoices} />
}
