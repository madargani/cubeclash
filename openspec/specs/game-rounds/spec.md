# game-rounds Specification

## Purpose

Defines how a game's rounds progress: where the round count comes from, when a round is complete, how members joining mid-round are handled, and when the game ends.

## Requirements

### Requirement: Round count from settings
The number of rounds in a game SHALL be taken from the room's settings. Round advancement SHALL be rejected once the final configured round is underway, and the game SHALL end after results for the final configured round are complete. No fixed round count SHALL be assumed anywhere in round progression.

#### Scenario: Configured rounds are played
- **WHEN** a room's settings specify 5 rounds
- **THEN** the game ends after round 5's results are complete, and no next-round action is offered after the final round

#### Scenario: A different configured count
- **WHEN** a room's settings specify a round count other than 5
- **THEN** round advancement and game end follow that configured count consistently

### Requirement: Round completion requires connected members only
A round SHALL be complete when every connected member of the room has a result for the current round. Disconnected members SHALL NOT block round completion.

#### Scenario: Departure does not stall the round
- **WHEN** a member disconnects without submitting and all remaining connected members submit
- **THEN** the round completes and the room advances to the between-rounds phase

#### Scenario: All connected members submit
- **WHEN** every connected member submits a result for the current round
- **THEN** the round completes

### Requirement: Mid-round joins spectate the current round
A member joining while a round is being solved SHALL NOT be required to solve that round and SHALL NOT block its completion; their first participation SHALL be the next round. The same applies to a member joining while the room is between rounds.

#### Scenario: Joining during a solve
- **WHEN** a member joins while a round is being solved
- **THEN** the round completes without them, and they solve when the next round begins

#### Scenario: The skipped round shows no result
- **WHEN** the round the joiner skipped completes
- **THEN** the leaderboard shows no result for that member in that round

### Requirement: One result per round per member
A member SHALL have at most one recorded result per round. Submissions for a round the member has already solved SHALL be ignored, including after a disconnect and rejoin.

#### Scenario: Duplicate submission after rejoin
- **WHEN** a member submits, rejoins the room, and submits again for the same round
- **THEN** only the first submission is recorded

### Requirement: Game over after the final round
When results for the final configured round are complete, the room's phase SHALL become `game_over` and no further round SHALL begin.

#### Scenario: Final round completes
- **WHEN** all connected members submit results for the final configured round
- **THEN** the room's phase becomes `game_over`
