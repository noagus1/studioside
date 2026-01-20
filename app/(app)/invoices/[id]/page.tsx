import { redirect } from 'next/navigation'
import { InvoiceDetailClient } from '../InvoiceDetailClient'
import { getInvoiceById } from '../actions'
import { getClients } from '../../sessions/actions'

interface Params {
  id: string
}

export default async function InvoiceDetailPage({ params }: { params: Params }) {
  const [invoiceResult, clientsResult] = await Promise.all([
    getInvoiceById(params.id),
    getClients(),
  ])

  if ('error' in invoiceResult) {
    if (invoiceResult.error === 'AUTHENTICATION_REQUIRED') {
      redirect('/login')
    }
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Invoice</h1>
        <p className="text-red-600">{invoiceResult.message}</p>
      </div>
    )
  }

  if ('error' in clientsResult) {
    if (clientsResult.error === 'AUTHENTICATION_REQUIRED') {
      redirect('/login')
    }
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Invoice</h1>
        <p className="text-red-600">{clientsResult.message}</p>
      </div>
    )
  }

  return <InvoiceDetailClient invoice={invoiceResult.invoice} clients={clientsResult.clients} />
}
