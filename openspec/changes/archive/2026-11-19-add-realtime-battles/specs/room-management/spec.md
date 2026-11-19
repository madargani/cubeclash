# Spec Delta

## ADDED Requirements

### Requirement: Members see room updates live
The system SHALL let a member keep a live channel open to their room while they view it, SHALL recognize them from their existing cuber credential, SHALL reject cubers who are not members of the room, and SHALL push the room's current state to connected members whenever it changes — the member list, the settings, and the presence of an active battle.

#### Scenario: A connection receives the current room state
- **WHEN** a member connects to their room
- **THEN** they receive the room's current state: its invite code, host, members, settings, and active battle or its absence

#### Scenario: A new member appears without a reload
- **WHEN** a cuber joins the room by invite code
- **THEN** every member's open room page shows the new member in its member list without a reload

#### Scenario: Settings changes reach every member
- **WHEN** the host saves new battle settings
- **THEN** every member's open room page shows the new settings without a reload

#### Scenario: A battle start reaches every member
- **WHEN** the host starts a battle
- **THEN** every member's open room page shows the battle without a reload

#### Scenario: A battle end returns members to the room
- **WHEN** the room's battle ends
- **THEN** every member's open room page shows the room without an active battle and its updated state, without a reload

#### Scenario: A cuber outside the room cannot open the channel
- **WHEN** a cuber without membership in the room connects to its live channel
- **THEN** the connection is rejected and no room state is shown
