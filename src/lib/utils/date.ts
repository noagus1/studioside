/**
 * Date Utilities
 * 
 * Helper functions for date manipulation, particularly for
 * invitation expiration dates.
 */

/**
 * Adds hours to a date and returns a new Date object.
 * 
 * @param date - Base date (defaults to now)
 * @param hours - Number of hours to add
 * @returns New Date object with hours added
 */
export function addHours(date: Date = new Date(), hours: number): Date {
  const result = new Date(date)
  result.setHours(result.getHours() + hours)
  return result
}

/**
 * Adds days to a date and returns a new Date object.
 * 
 * @param date - Base date (defaults to now)
 * @param days - Number of days to add
 * @returns New Date object with days added
 */
export function addDays(date: Date = new Date(), days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Adds minutes to a date and returns a new Date object.
 * 
 * @param date - Base date (defaults to now)
 * @param minutes - Number of minutes to add
 * @returns New Date object with minutes added
 */
export function addMinutes(date: Date = new Date(), minutes: number): Date {
  const result = new Date(date)
  result.setMinutes(result.getMinutes() + minutes)
  return result
}

/**
 * Adds weeks to a date and returns a new Date object.
 * 
 * @param date - Base date (defaults to now)
 * @param weeks - Number of weeks to add
 * @returns New Date object with weeks added
 */
export function addWeeks(date: Date = new Date(), weeks: number): Date {
  return addDays(date, weeks * 7)
}

/**
 * Formats a date to ISO string for database storage.
 * 
 * @param date - Date to format
 * @returns ISO string representation
 */
export function toISOString(date: Date): string {
  return date.toISOString()
}

/**
 * Checks if a date is in the past.
 * 
 * @param date - Date to check
 * @returns True if the date is in the past
 */
export function isPast(date: Date): boolean {
  return date < new Date()
}

/**
 * Checks if a date is in the future.
 * 
 * @param date - Date to check
 * @returns True if the date is in the future
 */
export function isFuture(date: Date): boolean {
  return date > new Date()
}

