# Client

React 19 frontend for CubeClash. Built with Vite, React Router 7, and Zustand.

## File Structure

```
src/
├── main.tsx                 # App entry point
├── App.tsx                  # Root component with router
├── socket.ts                # Socket.io client instance
├── index.css                # Global styles (Tailwind)
├── hooks/
│   ├── useGameStore.ts      # Zustand global state store
│   ├── useSocketListeners.ts    # Socket event subscriptions
│   ├── useSocketActions.ts  # Emit socket events
│   ├── useRoom.ts           # Room-specific hooks
│   ├── useHomeActions.ts    # Home page actions
│   └── useStackmat.ts       # Stackmat timer integration
├── pages/
│   ├── Home.tsx             # Landing page (create/join room)
│   └── RoomContainer.tsx   # Wrapper for lobby/timer/leaderboard
├── components/
│   ├── home/
│   │   ├── CreateRoomButton.tsx
│   │   └── JoinRoomButton.tsx
│   ├── lobby/
│   │   ├── Settings.tsx
│   │   └── MemberList.tsx
│   └── views/
│       ├── Lobby.tsx       # Pre-game room view
│       ├── Timer.tsx       # Active solve timer
│       ├── Results.tsx      # Per-round results
│       └── Leaderboard.tsx # Final standings
│   └── retroui/            # Custom UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Dialog.tsx
│       └── ...
└── lib/
    └── utils.ts            # Utility functions (cn, etc.)
```

## Socket Events

### Receiving Events (`useSocketListeners.ts`)

The client subscribes to these server events:

```typescript
socket.on("member_joined", (nickname) => { ... });
socket.on("member_left", (nickname) => { ... });
socket.on("settings_changed", (settings) => { ... });
socket.on("start_round", (scramble, round) => { ... });
socket.on("round_done", (leaderboard) => { ... });
socket.on("game_over", (leaderboard, scrambles) => { ... });
```

Each handler is registered via `useSocketListeners(handlers)` hook that manages cleanup on unmount.

### Sending Events (`useSocketActions.ts` / `useHomeActions.ts`)

**All socket event handling in the client MUST go through hooks.** Direct `socket.on()` or `socket.emit()` calls elsewhere in the codebase are forbidden — create or extend a hook instead.

```typescript
socket.emit("create_room", nickname, callback);
socket.emit("join_room", nickname, roomId, callback);
socket.emit("update_settings", roomId, settings);
socket.emit("start_game", roomId);
socket.emit("next_round", roomId);
socket.emit("submit_solve", roomId, time);
```

## State Management

All client state is managed via **Zustand** store in `useGameStore.ts`.

### Store Structure

```typescript
interface GameState {
  // User identity
  nickname: string;
  hostNickname: string;
  
  // Room info
  roomId: string;
  members: string[];
  settings: RoomSettings;
  
  // Game state
  stage: "lobby" | "timer" | "leaderboard" | "results";
  currentRound: number;
  scrambles: string[];
  leaderboard: LeaderboardEntry[];
  
  // Error handling
  homeError: string | null;
  
  // Actions
  actions: { setNickname, setRoomId, addMember, ... };
}
```

### Derived Hooks

| Hook | Returns |
|------|---------|
| `useNickname()` | Current user's nickname |
| `useIsHost()` | Boolean - is current user the host? |
| `useRoomId()` | Current room ID |
| `useMembers()` | Array of member nicknames |
| `useGameState()` | Current stage (`lobby`/`timer`/`leaderboard`/`results`) |
| `useScrambles()` | All scrambles for the game |
| `useCurrentScramble()` | Scramble for current round |
| `useLeaderboard()` | Current leaderboard entries |
| `useSettings()` | Room settings |
| `useCurrentRound()` | Current round number |

### State Flow

1. **Home** → User enters nickname, creates or joins room
2. **Lobby** → See members, host adjusts settings, start game
3. **Timer** → Solve with scramble displayed, submit time
4. **Leaderboard** → See round results, host advances or game ends
5. **Results** → Final standings with all scrambles
