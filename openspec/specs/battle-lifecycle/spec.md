# battle-lifecycle Specification

## Purpose

A battle starts as one host action that freezes the battle's configuration and participant set and prepares every round's scramble upfront, so a later realtime capability has everything it needs the moment it connects. Ending a battle is deliberately not part of this capability yet.

## Requirements

### Requirement: The host starts a battle
The system SHALL let the host start a battle in their room, SHALL record the room's current settings on the battle as its configuration, and SHALL record every room member as a participant of that battle. Starting a battle SHALL be rejected for members who are not the host.

#### Scenario: Starting a battle freezes configuration and participants
- **WHEN** the host starts a battle
- **THEN** the battle stores the room's settings as they are at that moment, and every room member is recorded as a participant

#### Scenario: A non-host cannot start a battle
- **WHEN** a member who is not the host attempts to start a battle
- **THEN** the attempt is rejected and no battle is created

### Requirement: Rounds and scrambles are generated upfront
The system SHALL, when a battle starts, immediately create one round per configured round, numbered in order, each carrying its own scramble for the configured event, so that no round's scramble needs to be generated later.

#### Scenario: Every round exists at start
- **WHEN** the host starts a battle configured for N rounds
- **THEN** N numbered rounds exist with scrambles for the configured event, before any solving begins

#### Scenario: Scrambles are distinct per round
- **WHEN** a battle's rounds are generated
- **THEN** no two rounds of the battle carry the same scramble

### Requirement: One active battle per room
The system SHALL reject starting a battle in a room that already has an active battle, and SHALL allow a room's next battle only after the active battle ends.

#### Scenario: A second battle cannot start while one is active
- **WHEN** the host attempts to start a battle in a room with an active battle
- **THEN** the attempt is rejected and the active battle is unchanged
