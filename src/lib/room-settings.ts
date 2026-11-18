import { getSupportedEvents } from '@cubingcenter/scrambler'
import { z } from 'zod'

/**
 * The event ids the scramble library supports. Read at module load: importing
 * the scrambler's root registers every puzzle generator, so this list is the
 * single source of truth for "supported" without duplicating it here.
 */
const supportedEventIds: readonly string[] = getSupportedEvents().map(
  ({ eventId }) => eventId,
)

export const defaultRoomSettings = {
  eventType: '333',
  roundCount: 5,
  inspectionSeconds: 15,
  readyTimeoutSeconds: 30,
} as const

/**
 * Room battle settings, validated in one place: bounds and defaults are
 * product guesses pinned here (and in the spec scenarios) — changing one is a
 * schema edit, never a migration. The JSON columns absorb future fields.
 */
export const RoomSettingsSchema = z.object({
  eventType: z
    .string()
    .refine(
      (value) => supportedEventIds.includes(value),
      `eventType must be one of: ${supportedEventIds.join(', ')}`,
    )
    .default(defaultRoomSettings.eventType),
  roundCount: z.coerce
    .number()
    .int('roundCount must be an integer')
    .min(1, 'roundCount must be at least 1')
    .max(20, 'roundCount must be at most 20')
    .default(defaultRoomSettings.roundCount),
  inspectionSeconds: z.coerce
    .number()
    .int('inspectionSeconds must be an integer')
    .min(0, 'inspectionSeconds must be at least 0')
    .max(60, 'inspectionSeconds must be at most 60')
    .default(defaultRoomSettings.inspectionSeconds),
  readyTimeoutSeconds: z.coerce
    .number()
    .int('readyTimeoutSeconds must be an integer')
    .min(5, 'readyTimeoutSeconds must be at least 5')
    .max(120, 'readyTimeoutSeconds must be at most 120')
    .default(defaultRoomSettings.readyTimeoutSeconds),
})

export type RoomSettings = z.output<typeof RoomSettingsSchema>

/** Parse raw settings (missing fields fall back to the defaults). Throws ZodError. */
export function parseRoomSettings(input: unknown): RoomSettings {
  return RoomSettingsSchema.parse(input ?? {})
}
