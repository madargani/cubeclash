# Spec Delta

## Purpose

The durable record of the battle domain: cuber identities, reusable rooms, battles, rounds, and solve times. It guarantees that facts which outlive a battle are stored once, constrained correctly, and remain historically accurate, so later lobby and realtime capabilities can build on it without owning storage decisions.

## ADDED Requirements

### Requirement: Guest identity rows
The system SHALL record each cuber as an identity row with a stable identifier, a display name, and a unique token serving as the cuber's reconnect credential, and SHALL keep the row claimable by a future account without changing its identifier.

#### Scenario: Identity is created unclaimed
- **WHEN** a cuber is recorded for the first time
- **THEN** an identity row exists with a unique token and no claim recorded

#### Scenario: Tokens are unique
- **WHEN** an identity row is written with a token already used by another identity
- **THEN** the database rejects the write

#### Scenario: Identity survives claiming
- **WHEN** an unclaimed identity row is later marked as claimed
- **THEN** its identifier is unchanged and all records referencing it remain linked

### Requirement: Reusable rooms with membership
The system SHALL store rooms as reusable containers identified by a unique invite code, owned by a host identity, holding the battle settings the host edits, and SHALL record room membership as links between identities and rooms.

#### Scenario: Room stores host and settings
- **WHEN** a room is created
- **THEN** it records a unique invite code, the host identity, and the room's battle settings

#### Scenario: Membership links a cuber to a room
- **WHEN** a cuber joins a room
- **THEN** a membership row links the cuber's identity to the room with a join timestamp

#### Scenario: Membership requires real parents
- **WHEN** a membership row references a nonexistent room or identity
- **THEN** the database rejects the write

### Requirement: Battles snapshot room configuration
The system SHALL store each battle with its own copy of the room's battle settings taken when the battle starts, so that later room edits never alter a past battle.

#### Scenario: Battle copies room settings at start
- **WHEN** a battle is started in a room
- **THEN** the battle row stores the room's settings as they were at start time

#### Scenario: Room edits leave history intact
- **WHEN** the host changes room settings after a battle has started
- **THEN** the started battle's stored configuration is unchanged

### Requirement: Battle participation is recorded
The system SHALL record, for each battle, the set of identities participating in it, independent of room membership.

#### Scenario: Participants are recorded at battle start
- **WHEN** a battle starts with a set of cubers
- **THEN** each participating identity has a participant row linking it to the battle

#### Scenario: No duplicate participants
- **WHEN** a battle records the same identity as a participant twice
- **THEN** the database rejects the duplicate

### Requirement: Rounds store shared scrambles
The system SHALL store each round of a battle with a round number and exactly one scramble shared by all participants.

#### Scenario: Round stores its scramble
- **WHEN** a round is created for a battle
- **THEN** the round records the battle it belongs to, its round number, and its scramble

#### Scenario: Round numbers are unique within a battle
- **WHEN** two rounds of the same battle are created with the same round number
- **THEN** the database rejects the duplicate

### Requirement: Solve records hold round times
The system SHALL store solve times one-per-round-per-participant as raw times with a penalty state, and SHALL NOT store final times; final times are derived from the raw time and penalty.

#### Scenario: A solve is recorded for one round of one cuber
- **WHEN** a cuber completes a round
- **THEN** a solve row stores the round, the cuber, the raw time, and the penalty state

#### Scenario: One solve per round per cuber
- **WHEN** a second solve row is written for the same cuber and round
- **THEN** the database rejects the duplicate

#### Scenario: Solves require real parents
- **WHEN** a solve row references a nonexistent round or identity
- **THEN** the database rejects the write

#### Scenario: Plus-two penalty derives the final time
- **WHEN** a solve's penalty state is a plus-two
- **THEN** the derived final time is the raw time plus two seconds

#### Scenario: DNF yields no final time
- **WHEN** a solve's penalty state is DNF
- **THEN** the solve has no derived final time

### Requirement: One phase checkpoint per battle
The system SHALL keep at most one checkpoint row per battle recording the battle's current round and phase, updated on each phase change, as the recovery source for a realtime runtime after a restart.

#### Scenario: Checkpoint reflects the current phase
- **WHEN** a battle's phase changes
- **THEN** the battle's single checkpoint row is updated to the new round and phase

#### Scenario: Transitions do not duplicate checkpoints
- **WHEN** a battle undergoes repeated phase changes
- **THEN** the battle still has exactly one checkpoint row

### Requirement: Schema changes only through migrations
The system SHALL create and alter the battle-domain schema exclusively through migration files applied by a migration command.

#### Scenario: Fresh database builds the schema
- **WHEN** the migration command runs against an empty database
- **THEN** all battle-domain tables exist with their constraints

#### Scenario: Migrated database is unaffected
- **WHEN** the migration command runs again against a database that is already migrated
- **THEN** the command completes without error and changes nothing
