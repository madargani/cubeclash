# Implementation Tasks: Core Competition Features (Phase 2)

> Work through these phases IN ORDER. Each phase builds on the previous.

## Before You Start

- [x] Read and understand spec.md
- [x] Read and understand design.md
- [x] Review Phase 1 code to understand existing patterns
- [x] Install cubing.js dependency: `cd apps/server && npm install cubing`
- [x] Run /own:advise for pre-work preparation
- [x] Ask mentor if anything is unclear

---

## Phase 1: User Identification System

> Add nicknames instead of socket IDs.

- [x] **Create NicknameInput component**
  - Input field with 3-20 char validation
  - Alphanumeric + spaces only
  - Location: `apps/client/src/components/NicknameInput.tsx`
    └── Depends on: Nothing

- [x] **Add nickname state to App.tsx**
  - Add `nickname` state
  - Show NicknameInput modal before room join
    └── Depends on: NicknameInput component

- [x] **Extend server Room type with nicknames**
  - Add `nicknames: Map<string, string>` to Room interface
  - Update `createRoom` and `addMember` to handle nicknames
    └── Depends on: Client sending nickname

- [x] **Add user:register Socket.IO event**
  - Client emits `user:register` with nickname
  - Server stores socket.id → nickname mapping
  - Broadcast nickname to room members
    └── Depends on: Room type extended

**Checkpoint:** Users see nicknames instead of socket IDs in member list.

---

## Phase 2: Scramble Generation

> Integrate cubing.js and distribute scrambles.

- [ ] **Create server scramble.ts module**
  - Import `randomScrambleForEvent` from cubing
  - Export `generateScramble()` function
  - Handle 3x3x3 ("333") event code
    └── Depends on: cubing.js installed

- [ ] **Extend Room with round state**
  - Add `currentScramble?: string` to Room
  - Add `roundState: "waiting" | "active" | "ended"`
    └── Depends on: scramble.ts created

- [ ] **Create Race type and races.ts**
  - Define Race interface with scramble, results, state
  - Create races Map for tracking active races
    └── Depends on: Room extended

- [ ] **Add round:start handler (server)**
  - Listen for `round:start` event
  - Generate scramble using cubing.js
  - Store in room, broadcast `scramble:new`
    └── Depends on: races.ts created

- [ ] **Create ScrambleDisplay component**
  - Display scramble text prominently
  - Copy-to-clipboard button (optional)
    └── Depends on: Client receives scramble

**Checkpoint:** Host can start round, all users see same scramble simultaneously.

---

## Phase 3: Timer UI

> Build cstimer-like timing interface.

- [ ] **Create useTimer hook**
  - State: idle | ready | inspection | running | stopped
  - Use performance.now() for precision
  - Handle spacebar hold (300ms threshold)
    └── Depends on: ScrambleDisplay exists

- [ ] **Create Timer component**
  - Large centered display (mm:ss.ms)
  - Visual states: green (ready), red (inspection), white (solving)
  - Keyboard event listeners (spacebar)
    └── Depends on: useTimer hook

- [ ] **Create InspectionCountdown component**
  - 15-second countdown (optional)
  - Visual + audio cues at 8s, 3s
  - Can skip inspection
    └── Depends on: Timer component

- [ ] **Create TimerView container**
  - Combines ScrambleDisplay + Timer + InspectionCountdown
  - Only shows when round is active
    └── Depends on: Timer, InspectionCountdown, ScrambleDisplay

- [ ] **Add timer:start/stop events**
  - Client emits `timer:start` when user begins
  - Client emits `solve:submit` with final time
  - Prevent double-starts
    └── Depends on: TimerView complete

**Checkpoint:** Users can time solves with spacebar, see scramble, use inspection.

---

## Phase 4: Leaderboard

> Live race results.

- [ ] **Create leaderboard.ts (server)**
  - Track RaceResults per room
  - Sort function: finished (by time), then DNF, then solving
    └── Depends on: Race type defined

- [ ] **Add solve:submit handler (server)**
  - Validate submission (time > 0, round active)
  - Add to leaderboard results
  - Broadcast `leaderboard:update`
    └── Depends on: leaderboard.ts created

- [ ] **Create LeaderboardPanel component**
  - Table: Rank | Nickname | Time | Status
  - Highlight current user's row
  - Real-time updates via Socket.IO
    └── Depends on: Server sends leaderboard:update

- [ ] **Add status tracking**
  - "solving" when timer starts
  - "finished" when submitted
  - "dnf" on disconnect
    └── Depends on: LeaderboardPanel created

**Checkpoint:** Leaderboard shows all participants, updates in real-time.

---

## Phase 5: Round Management

> Host controls race flow.

- [ ] **Create RoundControls component**
  - "Start Round" button (host only)
  - "End Round" button (host only)
  - Disabled when not host
    └── Depends on: round:start handler exists

- [ ] **Add round:end handler (server)**
  - Listen for `round:end` event
  - Mark race as ended
  - Stop accepting submissions
  - Broadcast final leaderboard
    └── Depends on: RoundControls component

- [ ] **Create RoomStatus component**
  - Show current round state: waiting | active | ended
  - Show "Waiting for host..." when appropriate
    └── Depends on: RoundControls complete

- [ ] **Host transfer on disconnect**
  - If host disconnects, assign new host (first member)
  - Notify room of new host
    └── Depends on: Round state tracked

**Checkpoint:** Host controls rounds, users see appropriate UI for each state.

---

## Phase 6: Connection Handling

> Graceful disconnections.

- [ ] **Handle user disconnect during solve**
  - Detect disconnection (Socket.IO built-in)
  - Mark user as DNF on leaderboard
  - Show as "offline" in UI
    └── Depends on: Leaderboard status tracking

- [ ] **Handle host disconnect**
  - Detect host disconnection
  - Reassign host to next member
  - Emit `host:changed` event
    └── Depends on: Host transfer logic

- [ ] **Allow reconnection (optional)**
  - Same socket ID reconnects → resume with same nickname
  - Restore state (if mid-round)
    └── Depends on: Disconnection handling

- [ ] **Clean up empty rooms**
  - Set timeout when room empties
  - Delete room after grace period (5 min)
    └── Depends on: Connection tracking

**Checkpoint:** Disconnections handled gracefully, no crashes or stuck states.

---

## Phase 7: Integration & Testing

> Connect everything together.

- [ ] **Update App.tsx orchestration**
  - Show correct view based on round state
  - Integrate all components
    └── Depends on: All components created

- [ ] **Add error handling**
  - Handle all error cases from spec.md
  - User-friendly error messages
    └── Depends on: All handlers implemented

- [ ] **Test happy path**
  - Create room → Join → Start Round → See Scramble → Time → Submit → See Leaderboard
    └── Depends on: App.tsx updated

- [ ] **Test edge cases**
  - Join mid-round
  - Disconnect during solve
  - Double submission
  - Invalid times
    └── Depends on: Happy path works

**Checkpoint:** Feature works end-to-end, handles edge cases gracefully.

---

## Phase 8: Polish

> Make it production-ready.

- [ ] **Final styling pass**
  - Match cstimer aesthetic (minimalist, focused)
  - Responsive design
    └── Depends on: Integration complete

- [ ] **Add loading states**
  - Scramble generation loading
  - Submission pending state
    └── Depends on: Styling complete

- [ ] **Accessibility check**
  - Keyboard navigation works
  - Screen reader friendly (aria labels)
    └── Depends on: Loading states added

- [ ] **Test against acceptance criteria**
  - Verify all 8 criteria from spec.md pass
    └── Depends on: Accessibility checked

- [ ] **Self-review: Does it match the spec?**
      └── Depends on: All criteria pass

**Checkpoint:** All acceptance criteria pass, ready for /own:done.

---

## Completion

- [ ] Self-review: Does it match the spec?
- [ ] Run /own:done for 6 Gates + code review + STAR story
- [ ] Run /own:retro to capture learnings

## Progress Tracking

| Phase                 | Status      | Started | Completed |
| --------------------- | ----------- | ------- | --------- |
| User Identification   | Not Started | -       | -         |
| Scramble Generation   | Not Started | -       | -         |
| Timer UI              | Not Started | -       | -         |
| Leaderboard           | Not Started | -       | -         |
| Round Management      | Not Started | -       | -         |
| Connection Handling   | Not Started | -       | -         |
| Integration & Testing | Not Started | -       | -         |
| Polish                | Not Started | -       | -         |

---

_Remember: YOU write the code. Ask your mentor when stuck._

## Tips for Phase 2

1. **Start with server types** - Define all interfaces in `types.ts` first
2. **Test incrementally** - Don't build all components before testing
3. **Use React DevTools** - Track state changes in real-time
4. **Socket.IO debugging** - Add console.logs to trace events
5. **cubing.js is async** - Remember `await randomScrambleForEvent()`
6. **Timer precision matters** - Always use `performance.now()` not `Date.now()`
7. **Spacebar handling** - Use `event.code === "Space"` not `event.key`
8. **State synchronization** - Server is source of truth for round state
