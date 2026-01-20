import { redirect } from 'next/navigation'
import { ClientsPageClient } from './ClientsPageClient'
import { getClients } from './actions'

export default async function ClientsPage() {
  const clientsResult = await getClients()

  if ('error' in clientsResult) {
    if (clientsResult.error === 'AUTHENTICATION_REQUIRED') {
      redirect('/login')
    }

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">People</h1>
          <p className="text-muted-foreground mt-1">Manage the people you work with.</p>
        </div>
        <div className="border rounded-lg p-8 text-center bg-muted/50">
          <p className="text-muted-foreground">{clientsResult.message}</p>
        </div>
      </div>
    )
  }

  return <ClientsPageClient clients={clientsResult.clients} />
}



