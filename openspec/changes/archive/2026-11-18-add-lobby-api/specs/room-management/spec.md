# Spec Delta

## Purpose

Rooms are the reusable gathering places for battles: a host creates one and shares its invite code, cubers join with that code, the host alone configures battle settings, and any member can read the room's current state.

## ADDED Requirements

### Requirement: A host creates a room with a shareable invite code
The system SHALL let any cuber create a room, SHALL record that cuber as the room's host and first member, SHALL assign the room a unique short invite code that another cuber can enter by hand, and SHALL store the room's battle settings from submitted or default values.

#### Scenario: Creating a room makes the cuber its host
- **WHEN** a cuber creates a room
- **THEN** the room records the cuber as host and first member, and shows its invite code for sharing

#### Scenario: Invite codes are unique
- **WHEN** a room is created with an invite code already used by another room
- **THEN** the system instead assigns the room a code no other room uses

### Requirement: Cubers join a room by invite code
The system SHALL let a cuber join a room by entering its invite code, SHALL make the cuber a member on first join, and SHALL treat joining again as a no-op rather than an error or a duplicate membership.

#### Scenario: A valid code joins the room
- **WHEN** a cuber enters the invite code of an existing room they have not joined
- **THEN** the cuber becomes a member and can read the room's state

#### Scenario: An unknown code is rejected
- **WHEN** a cuber enters a code that matches no room
- **THEN** the join is rejected with an error and the cuber is not added to any room

#### Scenario: Rejoining is idempotent
- **WHEN** a member enters their own room's invite code again
- **THEN** the cuber remains a single member and no duplicate membership is recorded

### Requirement: The host alone configures room settings
The system SHALL let the host edit the room's battle settings — the event, the number of rounds, the inspection length, and the ready timeout — and SHALL reject settings edits from non-hosts and edits whose values are invalid.

#### Scenario: The host updates settings
- **WHEN** the host submits valid battle settings
- **THEN** the room's settings reflect the submitted values

#### Scenario: A non-host cannot change settings
- **WHEN** a member who is not the host submits settings
- **THEN** the submission is rejected and the room's settings are unchanged

#### Scenario: Invalid values are rejected
- **WHEN** settings are submitted with an unsupported event, a round count outside 1–20, an inspection length outside 0–60 seconds, or a ready timeout outside 5–120 seconds
- **THEN** the submission is rejected naming the offending field, and the room's settings are unchanged

### Requirement: Members can read room state
The system SHALL let a member read the room's current state — its invite code, host, members with their display names, current settings, and the active battle if one exists — and SHALL reject reads from cubers outside the room.

#### Scenario: A member sees the room
- **WHEN** a member reads the room's state
- **THEN** they see the invite code, the host, the member list, the current settings, and the active battle or its absence

#### Scenario: A cuber outside the room cannot read its state
- **WHEN** a cuber without membership in a room attempts to read its state
- **THEN** the read is rejected and no room state is shown
