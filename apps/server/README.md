# Server

Express + Socket.io server for real-time multiplayer speedcubing competition.

## File Structure

```
src/
├── index.ts           # Entry point - Express & Socket.io setup
├── rooms.ts           # In-memory room data management
├── types/
│   └── scramble.ts    # Scramble generation using cubing library
└── handlers/
    ├── index.ts       # Registers all socket handlers
    ├── roomHandlers.ts    # Room creation, joining, settings
    └── gameHandlers.ts    # Game flow, rounds, scoring
```

## Socket Events

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `create_room` | `(nickname, callback)` | Create a new room, returns room ID |
| `join_room` | `(nickname, roomId, callback)` | Join existing room |
| `update_settings` | `(roomId, settings)` | Update room settings (host only) |
| `start_game` | `(roomId)` | Start the game (host only) |
| `next_round` | `(roomId)` | Advance to next round (host only) |
| `submit_solve` | `(roomId, time)` | Submit solve time |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `member_joined` | `(nickname)` | New player joined |
| `member_left` | `(nickname)` | Player left |
| `settings_changed` | `(settings)` | Room settings updated |
| `start_round` | `(scramble, round)` | New round started with scramble |
| `round_done` | `(leaderboard)` | All players finished, show results |
| `game_over` | `(leaderboard, scrambles)` | Game complete, final results |

## Room Data Management

Rooms are stored in-memory using a `Map<string, Room>`:

```typescript
const rooms = new Map<string, Room>();
```

### Room Structure

```typescript
interface Room {
  id: string;           // 8-char uppercase (e.g., "ABCD1234")
  hostId: string;      // Socket ID of room creator
  members: Member[];   // Players in the room
  round: number;       // Current round (-1 = lobby, 0-4 = game in progress)
  results: Map<string, number[]>;  // memberId → array of solve times
  scrambles: string[]; // Generated scrambles for each round
  settings: RoomSettings;
}
```

### Key Functions (`rooms.ts`)

- `createRoom(hostId, hostNickname)` — Creates room with unique 8-char ID
- `getRoom(roomId)` — Retrieves room by ID
- `addMember(roomId, memberId, nickname)` — Adds player to room
- `removeMember(roomId, memberId)` — Removes player, returns nickname
- `startGame(roomId)` — Initializes results Map, resets round to 0
- `addResult(roomId, memberId, time)` — Records solve time
- `areAllDone(roomId)` — Checks if all players submitted
- `incrementRound(roomId)` — Advances to next round
- `updateSettings(roomId, settings)` — Updates room config (game not started)

### Leaderboard Calculation

Computed in `gameHandlers.ts:calculateLeaderboard()`:
- Ranks players by average of middle times (drops best/worst)
- Shows individual round times, best single, and average
- Players without all rounds complete sorted to bottom
