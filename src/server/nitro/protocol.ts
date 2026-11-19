import { z } from 'zod'

import { RoomSettingsSchema } from '../../lib/room-settings'

/**
 * The wire protocol for the room's live channel. Two directions, one rule:
 * every server state message is a full snapshot the client applies by
 * replacement — no deltas, no merge logic, so a reconnect heals by
 * construction.
 */

/** Solve penalties, in csTimer semantics. Mirrors `src/db/schema.ts`. */
export const PenaltySchema = z.enum(['none', 'plus_two', 'dnf'])
export type Penalty = z.infer<typeof PenaltySchema>

/** The synchronized phases a round moves through. */
export const PhaseSchema = z.enum([
  'scramble',
  'countdown',
  'inspection',
  'solving',
  'results',
])
export type Phase = z.infer<typeof PhaseSchema>

/* ------------------------------------------------------------------ */
/* Client -> server                                                   */
/* ------------------------------------------------------------------ */

export const ClientReadySchema = z.object({
  type: z.literal('ready'),
})

export const ClientSubmitSchema = z.object({
  type: z.literal('submit'),
  timeMs: z.number().int().nonnegative('timeMs must be a non-negative integer'),
  penalty: PenaltySchema,
})

export const ClientForceStartSchema = z.object({
  type: z.literal('forceStart'),
})

/**
 * A host's settings save. The settings stay loose on the wire — the room page
 * sends raw form values — and are validated by `parseRoomSettings` on the
 * socket side, the same schema the service uses.
 */
export const ClientUpdateSettingsSchema = z.object({
  type: z.literal('updateSettings'),
  settings: z.record(z.string(), z.unknown()),
})

export const ClientStartBattleSchema = z.object({
  type: z.literal('startBattle'),
})

/**
 * Any message a connected cuber may send over the room's channel: room-level
 * mutations (`updateSettings`, `startBattle`) and battle-runtime actions
 * (`ready`, `submit`, `forceStart`).
 */
export const ClientMessageSchema = z.discriminatedUnion('type', [
  ClientReadySchema,
  ClientSubmitSchema,
  ClientForceStartSchema,
  ClientUpdateSettingsSchema,
  ClientStartBattleSchema,
])
export type ClientMessage = z.infer<typeof ClientMessageSchema>

/* ------------------------------------------------------------------ */
/* Server -> client                                                   */
/* ------------------------------------------------------------------ */

/** A cuber in a room: identity plus display name. */
export const RoomMemberSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
})

/** The active battle's summary, as carried by the room snapshot. */
export const ActiveBattleSchema = z.object({
  id: z.string(),
  status: z.string(),
  /** ISO timestamp; the room service reads a Date and the snapshot flattens it. */
  startedAt: z.string(),
  settings: RoomSettingsSchema,
})

/**
 * The room's current state: invite code, host, members, settings, and whether
 * a battle is active. Published on connect and after every room change
 * (join, settings save, battle start, battle end).
 */
export const RoomStateMessageSchema = z.object({
  type: z.literal('roomState'),
  id: z.string(),
  inviteCode: z.string(),
  host: RoomMemberSchema,
  members: z.array(RoomMemberSchema),
  settings: RoomSettingsSchema,
  activeBattle: ActiveBattleSchema.nullable(),
})
export type RoomStateMessage = z.infer<typeof RoomStateMessageSchema>

/** One participant's ranked solve within a completed round. */
export const RoundResultSchema = z.object({
  userId: z.string(),
  timeMs: z.number().int().nonnegative(),
  penalty: PenaltySchema,
  placement: z.number().int().positive(),
})
export type RoundResult = z.infer<typeof RoundResultSchema>

/** A completed round's ranked solves. */
export const CompletedRoundSchema = z.object({
  roundId: z.string(),
  results: z.array(RoundResultSchema),
})
export type CompletedRound = z.infer<typeof CompletedRoundSchema>

/** A competitor's accumulated placement points at battle end. */
export const StandingSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  points: z.number().int(),
})
export type Standing = z.infer<typeof StandingSchema>

/**
 * The battle's full current state. Only the current round's scramble travels;
 * completed rounds travel as ranked results, and solve times are withheld
 * until their round's results phase opens.
 */
export const BattleStateMessageSchema = z.object({
  type: z.literal('battleState'),
  battleId: z.string(),
  phase: PhaseSchema,
  roundId: z.string().nullable(),
  /** 1-based number of the current round. */
  roundNumber: z.number().int().positive(),
  /** Absolute ISO deadline for the current gated phase, or null. */
  deadlineAt: z.string().nullable(),
  scramble: z.string().nullable(),
  /** The participant set frozen at battle start, with display names. */
  participants: z.array(RoomMemberSchema),
  readyUserIds: z.array(z.string()),
  submittedUserIds: z.array(z.string()),
  /** Completed rounds (and the current round once its results open). */
  roundResults: z.array(CompletedRoundSchema),
  battleEnded: z.boolean(),
  /** Present once the battle has ended. */
  standings: z.array(StandingSchema).nullable(),
})
export type BattleStateMessage = z.infer<typeof BattleStateMessageSchema>

export const ErrorMessageSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
})
export type ErrorMessage = z.infer<typeof ErrorMessageSchema>

/** Any message the server may send over a room's channel. */
export const ServerMessageSchema = z.discriminatedUnion('type', [
  RoomStateMessageSchema,
  BattleStateMessageSchema,
  ErrorMessageSchema,
])
export type ServerMessage = z.infer<typeof ServerMessageSchema>

/* ------------------------------------------------------------------ */
/* Parsing                                                            */
/* ------------------------------------------------------------------ */

/** Parse a client message, throwing a readable error on malformed input. */
export function parseClientMessage(input: unknown): ClientMessage {
  return ClientMessageSchema.parse(input)
}

/** Parse a server message, throwing a readable error on malformed input. */
export function parseServerMessage(input: unknown): ServerMessage {
  return ServerMessageSchema.parse(input)
}

/** Safely parse a client message without throwing. */
export function safeParseClientMessage(input: unknown) {
  return ClientMessageSchema.safeParse(input)
}

/** Safely parse a server message without throwing. */
export function safeParseServerMessage(input: unknown) {
  return ServerMessageSchema.safeParse(input)
}
