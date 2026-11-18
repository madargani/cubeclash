import { eq } from 'drizzle-orm'

import type { Database } from '../db/index'
import { users } from '../db/schema'

export type Identity = typeof users.$inferSelect

/**
 * Create a guest identity: an unclaimed `users` row with a fresh random
 * token. The token — not the display name — is the credential; names are not
 * unique and may be shared.
 */
export async function createGuestIdentity(
  db: Database,
  displayName: string,
): Promise<Identity> {
  const [identity] = await db
    .insert(users)
    .values({ displayName, token: crypto.randomUUID() })
    .returning()
  return identity
}

/** Resolve the cuber a token belongs to, or null for an unknown token. */
export async function resolveIdentity(
  db: Database,
  token: string,
): Promise<Identity | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.token, token))
    .limit(1)
  return rows[0] ?? null
}
