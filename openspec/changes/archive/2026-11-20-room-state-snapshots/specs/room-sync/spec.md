# Spec Delta

## Purpose

Defines how every client in a room receives the complete, authoritative state of that room as a single broadcast, so any client at any point in a game can render correctly without tracking incremental updates.

## ADDED Requirements

### Requirement: Full snapshot broadcast on every mutation
The server SHALL synchronize room state by broadcasting a single `room_state` event to all room members after every room mutation (room creation, member join, rejoin, disconnect, settings change, game start, round advance, solve submission). The event payload SHALL be a complete snapshot of the room; the server SHALL NOT send partial-update or delta events for room state.

#### Scenario: Member joins an existing room
- **WHEN** a member joins a room
- **THEN** all room members, including the joiner, receive a snapshot containing the full member list

#### Scenario: Host changes settings
- **WHEN** the host updates room settings
- **THEN** all members receive a snapshot reflecting the new settings

#### Scenario: A solve is submitted
- **WHEN** a member submits a solve
- **THEN** all members receive a snapshot whose leaderboard includes that result

### Requirement: Snapshot contents
A snapshot SHALL include the room id, the effective host's member id, the current phase, the current round number, the settings, all scrambles issued so far, the member list with per-member connection status, and a leaderboard with every member's per-round results including live current-round results. A snapshot SHALL NOT include per-recipient data; all members of a room receive identical payloads.

#### Scenario: Mid-round results are visible
- **WHEN** a snapshot is broadcast while a round is being solved and some members have already submitted
- **THEN** the leaderboard shows submitted times for that round alongside null results for members who have not solved

### Requirement: Server-derived phase
A snapshot's phase SHALL be one of `lobby`, `solving`, `round_done`, `game_over`, derived from room facts at broadcast time: `lobby` before the game starts; `solving` while the current round is underway; `round_done` when all connected members have submitted and rounds remain; `game_over` when all connected members have submitted the final round. The phase SHALL NOT depend on which mutation triggered the broadcast.

#### Scenario: Game start
- **WHEN** the host starts the game
- **THEN** the broadcast snapshot's phase is `solving` with round 0 and that round's scramble

#### Scenario: Final solve of a non-final round
- **WHEN** the last connected member submits their result for a round that is not the final round
- **THEN** the broadcast snapshot's phase is `round_done`

#### Scenario: Final solve of the final round
- **WHEN** the last connected member submits their result for the final round
- **THEN** the broadcast snapshot's phase is `game_over`

### Requirement: Client renders the latest snapshot
The client SHALL determine its view entirely from the most recent snapshot's phase and round, without reconstructing game transitions from event sequences. A client that begins or resumes receiving snapshots at any point in a game SHALL render the view matching the current phase.

#### Scenario: Rejoining mid-round
- **WHEN** a member rejoins while a round is being solved
- **THEN** the client shows the solving view with the current round's scramble

#### Scenario: Joining between rounds
- **WHEN** a new member joins while the room is between rounds
- **THEN** the client shows the leaderboard view for the completed round
