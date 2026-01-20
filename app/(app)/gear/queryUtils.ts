// Helper utilities for gear queries (kept outside server action file to avoid thenable/await pitfalls)
import type { GearFilters } from './actions'

export function applyFiltersToQuery(query: any, filters: GearFilters) {
  let filteredQuery = query

  if (filters.types && filters.types.length > 0) {
    const typeIds = filters.types.filter(Boolean)
    if (typeIds.length) {
      filteredQuery = filteredQuery.in('type_id', typeIds)
    }
  }

  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim().toLowerCase()}%`
    filteredQuery = filteredQuery.or(
      [
        `brand.ilike.${term}`,
        `model.ilike.${term}`,
        `type.name.ilike.${term}`,
      ].join(',')
    )
  }

  return filteredQuery
}

