import { redirect } from 'next/navigation'
import { getGearFacets, getGearWithFilters, type GearFacetOptions } from './actions'
import { GearPageClient } from './GearPageClient'

export default async function GearPage() {
  const [gearResult, facetsResult] = await Promise.all([getGearWithFilters({}), getGearFacets()])

  if ('error' in gearResult) {
    if (gearResult.error === 'AUTHENTICATION_REQUIRED') {
      redirect('/login')
    }

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Gear</h1>
          <p className="text-muted-foreground mt-1">Manage your studio gear</p>
        </div>

        <div className="border rounded-lg bg-muted/50 p-8 text-center text-muted-foreground">
          <p>{gearResult.message}</p>
        </div>
      </div>
    )
  }

  if ('error' in facetsResult) {
    if (facetsResult.error === 'AUTHENTICATION_REQUIRED') {
      redirect('/login')
    }

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Gear</h1>
          <p className="text-muted-foreground mt-1">Manage your studio gear</p>
        </div>

        <div className="border rounded-lg bg-muted/50 p-8 text-center text-muted-foreground">
          <p>{facetsResult.message}</p>
        </div>
      </div>
    )
  }

  const facets: GearFacetOptions = facetsResult.success ? facetsResult.facets : { types: [] }

  return <GearPageClient initialGear={gearResult.gear} initialFacets={facets} />
}
