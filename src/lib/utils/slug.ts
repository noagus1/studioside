/**
 * Slug Generation Utility
 * 
 * Converts text to URL-safe slugs.
 * Used for auto-generating studio slugs from names.
 */

/**
 * Generates a URL-safe slug from a given string.
 * 
 * Converts:
 * - "My Music Studio" → "my-music-studio"
 * - "Studio 123!" → "studio-123"
 * - "Test_Studio" → "test-studio"
 * 
 * Rules:
 * - Lowercase
 * - Replace spaces and special chars with hyphens
 * - Remove invalid characters
 * - Collapse multiple hyphens
 * - Trim hyphens from start/end
 * 
 * @param text - The text to convert to a slug
 * @returns URL-safe slug string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove all characters that aren't letters, numbers, or hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Collapse multiple consecutive hyphens into one
    .replace(/-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Ensure it's not empty (fallback to 'studio' if empty)
    || 'studio'
}

/**
 * Generates a unique slug by appending a number if needed.
 * 
 * This is a client-side helper. The actual uniqueness check
 * happens in the database, but this can help avoid conflicts.
 * 
 * @param baseSlug - The base slug to make unique
 * @param existingSlugs - Array of existing slugs to check against
 * @returns A unique slug
 */
export function generateUniqueSlug(
  baseSlug: string,
  existingSlugs: string[] = []
): string {
  let slug = baseSlug
  let counter = 1

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug
}






















