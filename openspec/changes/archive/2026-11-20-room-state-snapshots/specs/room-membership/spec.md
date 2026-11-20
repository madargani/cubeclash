# Spec Delta

## Purpose

Defines how members hold a stable identity within a room, how that identity survives disconnects and page reloads, and how host role and room lifetime are governed by connection state.

## ADDED Requirements

### Requirement: Stable member identity
Each room member SHALL be identified by a server-issued member id that is independent of the socket connection. Solve results SHALL remain associated with the member's id across disconnects, and a member who rejoins SHALL resume their existing results.

#### Scenario: Results survive a page reload
- **WHEN** a member reloads the page mid-round and rejoins the room
- **THEN** their previously submitted results are still theirs, and a solve submitted after rejoining is appended to their existing results

### Requirement: Rejoin with persisted credentials
The client SHALL persist `roomId`, `memberId`, and `nickname` for the current room in sessionStorage and SHALL attempt to rejoin automatically when the application loads with stored credentials. A successful rejoin SHALL restore membership and mark the member connected; a failed rejoin (room deleted or member unknown) SHALL clear the stored credentials and leave the member at the home screen.

#### Scenario: Refresh during a game
- **WHEN** a member reloads the page while a game is in progress
- **THEN** they rejoin the room automatically and land in the view matching the current phase

#### Scenario: Stale credentials
- **WHEN** the application loads with credentials for a room that no longer exists
- **THEN** the rejoin is rejected, the stored credentials are cleared, and the home screen is shown

### Requirement: One connection per member
A rejoin attempt for a member id that is currently connected SHALL be rejected with an error, leaving the existing connection bound.

#### Scenario: Second browser tab
- **WHEN** a member with an active connection opens a second tab that attempts to rejoin with the same credentials
- **THEN** the second tab receives an error and is not bound to the member

### Requirement: Unique nicknames
A join SHALL be rejected when the requested nickname is already used by any member of the room, whether that member is connected or not.

#### Scenario: Nickname collision with a disconnected member
- **WHEN** a new joiner requests a nickname held by a disconnected member
- **THEN** the join is rejected with an error

### Requirement: Connection status tracking
On disconnect, a member SHALL be marked disconnected rather than removed. A disconnected member's past results SHALL remain on the leaderboard, and a successful rejoin SHALL mark the member connected again.

#### Scenario: Closing the tab mid-round
- **WHEN** a connected member closes their tab while a round is being solved
- **THEN** other members' snapshots show that member as disconnected, and that member's submitted results remain on the leaderboard

### Requirement: Effective host
The host role SHALL belong to the room's host member whenever that member is connected. While the host member is disconnected, the role SHALL pass to the earliest-joined connected member, and SHALL return to the host member upon their rejoin. Host-privileged actions (starting the game, advancing rounds, changing settings) SHALL be permitted only for the member currently holding the host role.

#### Scenario: Host refreshes
- **WHEN** the host reloads the page during the game and rejoins
- **THEN** they retain the host role and host controls remain available to them

#### Scenario: Host abandons the room
- **WHEN** the host disconnects and does not rejoin
- **THEN** snapshots identify the earliest-joined connected member as host, and that member can perform host-privileged actions

### Requirement: Room deletion on last disconnect
A room SHALL be deleted when it has no connected members. A host's disconnect alone SHALL NOT delete the room or affect other members' connections.

#### Scenario: Host refreshes while others are present
- **WHEN** the host disconnects while other members are connected
- **THEN** the room survives, other members keep playing, and the room state remains available

#### Scenario: Last member leaves
- **WHEN** the final connected member disconnects
- **THEN** the room is deleted and subsequent rejoin attempts for it fail

### Requirement: Room association via connection
After joining, a member's subsequent messages (starting the game, advancing a round, submitting a solve, updating settings) SHALL be applied to the room bound to their connection and SHALL NOT carry a room identifier. A game-action message from a socket not bound to a room SHALL have no effect.

#### Scenario: Solve submission without a room argument
- **WHEN** a bound member submits a solve
- **THEN** the result is recorded in the room bound to their connection

#### Scenario: Socket bound to no room
- **WHEN** a socket that never joined a room emits a game action
- **THEN** no room state changes
