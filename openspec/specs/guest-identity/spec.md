# guest-identity Specification

## Purpose

Cubers join without accounts: a display name plus a browser-held credential is enough for the system to recognize them across visits and actions, until a future accounts capability claims the identity.

## Requirements

### Requirement: Guests join with a display name and receive a reconnect credential
The system SHALL accept a display name from a visitor with no recognized identity when they complete a lobby action that requires one, SHALL recognize that visitor as a cuber from then on, and SHALL issue a credential that identifies the cuber on later requests without being readable by page scripts.

#### Scenario: First action creates a guest identity
- **WHEN** a visitor without a recognized identity completes a lobby action requiring one, providing a display name
- **THEN** the system recognizes that visitor as a cuber with that display name on subsequent requests

#### Scenario: The credential is not readable by page scripts
- **WHEN** the credential is issued to a visitor
- **THEN** it is stored in a way that scripts running in the page cannot read it

#### Scenario: An identity is created once
- **WHEN** a visitor who already holds a recognized identity completes another lobby action
- **THEN** no additional identity is created for that visitor

### Requirement: Returning visitors are recognized by their credential
The system SHALL resolve the current cuber from the visitor's credential on every request, SHALL treat a missing or unknown credential as a new visitor, and SHALL NOT ask an already-recognized cuber for their name again.

#### Scenario: A returning visitor keeps their identity
- **WHEN** a visitor presents a previously issued credential
- **THEN** the system treats them as the cuber that credential belongs to, without asking for a display name

#### Scenario: An unknown credential is not an identity
- **WHEN** a visitor presents no credential, or a credential that matches no cuber
- **THEN** the system treats them as a new visitor who must provide a display name before identity-requiring actions
