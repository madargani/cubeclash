# Spec Delta

## ADDED Requirements

### Requirement: A battle ends after its final round
The system SHALL end a battle when its final round's results gate closes, SHALL record when the battle ended, and SHALL leave the room able to start its next battle.

#### Scenario: The final round ends the battle
- **WHEN** the final round's results gate closes
- **THEN** the battle is no longer active and its end is recorded

#### Scenario: The room accepts a new battle after the end
- **WHEN** the host starts a battle after the room's previous battle has ended
- **THEN** the new battle is created
