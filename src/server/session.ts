import { getCookie, setCookie } from '@tanstack/react-start/server'

import type { Database } from '../db/index'
import { resolveIdentity, type Identity } from './identity'

/**
 * The httpOnly cookie carrying `users.token` (SameSite=Lax, path=/). Scripts
 * running in the page cannot read it; the server resolves the cuber from it
 * on every request.
 */
export const IDENTITY_COOKIE = 'cubeclash_token'

/**
 * Resolve the current cuber from the request's identity cookie.
 * Returns null for a visitor without one, or with an unknown token — both
 * are "a new visitor who must provide a display name".
 */
export async function getCurrentCuber(
  db: Database,
): Promise<Identity | null> {
  const token = getCookie(IDENTITY_COOKIE)
  if (!token) return null
  return resolveIdentity(db, token)
}

/** Issue the identity cookie so later requests resolve this cuber. */
export function issueIdentityCookie(token: string): void {
  setCookie(IDENTITY_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
}
