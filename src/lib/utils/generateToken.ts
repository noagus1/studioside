/**
 * Token Generation Utilities
 * 
 * Secure token generation for invitations and other use cases.
 */

import { randomBytes } from 'crypto'

/**
 * Generates a secure random token using crypto.randomBytes.
 * 
 * This is suitable for invitation tokens, CSRF tokens, and other
 * security-sensitive use cases.
 * 
 * @param length - Number of bytes to generate (default: 32)
 * @returns Base64URL-encoded token string
 */
export function generateToken(length: number = 32): string {
  const bytes = randomBytes(length)
  // Convert to base64url encoding (URL-safe)
  return bytes.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Generates a UUID v4 token.
 * 
 * Alternative token generation method using UUID.
 * 
 * @returns UUID string
 */
export function generateUUIDToken(): string {
  // Using crypto.randomUUID if available (Node 14.17+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // Fallback for older Node versions
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

