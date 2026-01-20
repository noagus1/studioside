import { createHash } from 'crypto'

/**
 * Hashes a token using SHA-256 and returns a hex digest.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
