import { relations } from 'drizzle-orm'
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  unique,
} from 'drizzle-orm/sqlite-core'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'

const timestamp = (name: string) => integer(name, { mode: 'timestamp' })

/**
 * Identity rows for cubers. Created unclaimed for guests; `claimed_at` stays
 * null until a future accounts change adopts the row. `token` is the unique
 * credential used as the reconnect cookie value.
 */
export const users = sqliteTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  displayName: text('display_name').notNull(),
  token: text('token').notNull().unique(),
  claimedAt: timestamp('claimed_at'),
  createdAt: timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date()),
})

/** Reusable containers for battles, identified by a unique invite code. */
export const rooms = sqliteTable('rooms', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  inviteCode: text('invite_code').notNull().unique(),
  hostId: text('host_id')
    .notNull()
    .references(() => users.id),
  settings: text('settings', { mode: 'json' })
    .notNull()
    .$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date()),
})

/** Membership links between identities and rooms. */
export const roomMembers = sqliteTable(
  'room_members',
  {
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.roomId, table.userId] })],
)

/**
 * A battle run. `settings` is a copy of the room's settings taken at start so
 * past battles stay historically accurate when room settings change later.
 */
export const battles = sqliteTable('battles', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id),
  settings: text('settings', { mode: 'json' })
    .notNull()
    .$type<Record<string, unknown>>(),
  status: text('status').notNull().default('active'),
  startedAt: timestamp('started_at')
    .notNull()
    .$defaultFn(() => new Date()),
  endedAt: timestamp('ended_at'),
})

/** The set of identities participating in a battle, independent of membership. */
export const battleParticipants = sqliteTable(
  'battle_participants',
  {
    battleId: text('battle_id')
      .notNull()
      .references(() => battles.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.battleId, table.userId] })],
)

/** Rounds of a battle, each with the one scramble shared by all participants. */
export const rounds = sqliteTable(
  'rounds',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    battleId: text('battle_id')
      .notNull()
      .references(() => battles.id, { onDelete: 'cascade' }),
    roundNumber: integer('round_number').notNull(),
    scramble: text('scramble').notNull(),
    createdAt: timestamp('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    unique('rounds_battle_round_number_unique').on(
      table.battleId,
      table.roundNumber,
    ),
  ],
)

/** Solve penalties, in csTimer semantics. */
export type Penalty = 'none' | 'plus_two' | 'dnf'

/**
 * Solve times, one per round per participant. `timeMs` is the raw
 * client-reported time; the final time is derived (raw + 2000 for plus_two,
 * no result for dnf), never stored.
 */
export const solves = sqliteTable(
  'solves',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    roundId: text('round_id')
      .notNull()
      .references(() => rounds.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    timeMs: integer('time_ms').notNull(),
    penalty: text('penalty').notNull().default('none').$type<Penalty>(),
    createdAt: timestamp('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [unique('solves_round_user_unique').on(table.roundId, table.userId)],
)

/**
 * The bridge a realtime runtime reads to resync after a server restart.
 * One row per battle, upserted on every phase change; ready state is cheap
 * to redo and is deliberately not persisted.
 */
export const phaseCheckpoints = sqliteTable('phase_checkpoints', {
  battleId: text('battle_id')
    .primaryKey()
    .references(() => battles.id, { onDelete: 'cascade' }),
  roundId: text('round_id')
    .notNull()
    .references((): AnySQLiteColumn => rounds.id, { onDelete: 'cascade' }),
  phase: text('phase').notNull(),
  deadlineAt: timestamp('deadline_at'),
  updatedAt: timestamp('updated_at')
    .notNull()
    .$defaultFn(() => new Date()),
})

export const usersRelations = relations(users, ({ many }) => ({
  hostedRooms: many(rooms),
  roomMemberships: many(roomMembers),
  battleParticipations: many(battleParticipants),
  solves: many(solves),
}))

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  host: one(users, { fields: [rooms.hostId], references: [users.id] }),
  members: many(roomMembers),
  battles: many(battles),
}))

export const roomMembersRelations = relations(roomMembers, ({ one }) => ({
  room: one(rooms, { fields: [roomMembers.roomId], references: [rooms.id] }),
  user: one(users, { fields: [roomMembers.userId], references: [users.id] }),
}))

export const battlesRelations = relations(battles, ({ one, many }) => ({
  room: one(rooms, { fields: [battles.roomId], references: [rooms.id] }),
  participants: many(battleParticipants),
  rounds: many(rounds),
  checkpoint: one(phaseCheckpoints, {
    fields: [battles.id],
    references: [phaseCheckpoints.battleId],
  }),
}))

export const battleParticipantsRelations = relations(
  battleParticipants,
  ({ one }) => ({
    battle: one(battles, {
      fields: [battleParticipants.battleId],
      references: [battles.id],
    }),
    user: one(users, {
      fields: [battleParticipants.userId],
      references: [users.id],
    }),
  }),
)

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  battle: one(battles, {
    fields: [rounds.battleId],
    references: [battles.id],
  }),
  solves: many(solves),
}))

export const solvesRelations = relations(solves, ({ one }) => ({
  round: one(rounds, { fields: [solves.roundId], references: [rounds.id] }),
  user: one(users, { fields: [solves.userId], references: [users.id] }),
}))

export const phaseCheckpointsRelations = relations(
  phaseCheckpoints,
  ({ one }) => ({
    battle: one(battles, {
      fields: [phaseCheckpoints.battleId],
      references: [battles.id],
    }),
    round: one(rounds, {
      fields: [phaseCheckpoints.roundId],
      references: [rounds.id],
    }),
  }),
)
