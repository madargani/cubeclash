# Implementation Tasks: Project Foundation (Phase 1)

> Work through these phases IN ORDER. Each phase builds on the previous.

## Before You Start

- [x] Read and understand spec.md
- [x] Read and understand design.md
- [x] Run /own:advise for pre-work preparation
- [x] Check that dependencies are met (Node.js 18+, npm)
- [x] Verify ports 3000 and 5173 are available
- [x] Ask mentor if anything is unclear

---

## Phase 1: Project Structure

> Create directories and root configuration.

- [x] Create `apps/` directory
      └── No dependencies
- [x] Create `apps/client/` directory
      └── No dependencies
- [x] Create `apps/server/` directory
      └── No dependencies
- [x] Create `ownyourcode/specs/active/phase-1-foundation/` (already done)
      └── No dependencies
- [x] Create root `package.json` with workspace config
  ```json
  {
    "name": "cubeclash",
    "version": "1.0.0",
    "private": true,
    "workspaces": ["apps/*"],
    "scripts": {
      "dev": "concurrently \"npm run dev -w apps/server\" \"npm run dev -w apps/client\"",
      "build": "npm run build -w apps/client && npm run build -w apps/server",
      "install:all": "npm install"
    },
    "devDependencies": {
      "concurrently": "^8.2.2"
    }
  }
  ```
  └── Depends on: Directories exist
- [x] Run `npm install` in root
      └── Depends on: Root package.json created

**Checkpoint:** Directories exist, root dependencies installed.

---

## Phase 2: Server Setup (Express + Socket.IO)

> Build the backend foundation.

- [x] Create `apps/server/package.json`
  ```json
  {
    "name": "cubeclash-server",
    "version": "1.0.0",
    "type": "module",
    "scripts": {
      "dev": "tsx watch src/index.ts",
      "build": "tsc",
      "start": "node dist/index.js"
    },
    "dependencies": {
      "express": "^5.0.0",
      "socket.io": "^4.8.3"
    },
    "devDependencies": {
      "@types/express": "^5.0.0",
      "@types/node": "^20.0.0",
      "typescript": "^5.9.3",
      "tsx": "^4.7.0"
    }
  }
  ```
  └── Depends on: apps/server/ directory exists
- [x] Create `apps/server/tsconfig.json`
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "Node16",
      "moduleResolution": "Node16",
      "outDir": "./dist",
      "rootDir": "./src",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "declaration": true,
      "declarationMap": true,
      "sourceMap": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
  }
  ```
  └── Depends on: apps/server/ directory exists
- [x] Install server dependencies: `npm install -w apps/server`
      └── Depends on: apps/server/package.json created
- [x] Create `apps/server/src/index.ts` with basic Express + Socket.IO setup

  ```typescript
  import express from "express";
  import { createServer } from "http";
  import { Server } from "socket.io";

  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  ```

  └── Depends on: Server dependencies installed

- [x] Test server starts: `npm run dev -w apps/server`
      └── Depends on: apps/server/src/index.ts created

**Checkpoint:** Server runs on port 3000, accepts connections.

---

## Phase 3: Client Setup (React + Vite)

> Build the frontend foundation.

- [x] Scaffold Vite project: `npm create vite@latest apps/client -- --template react-ts`
      OR manually create structure
      └── Depends on: apps/client/ directory exists
- [x] Install client dependencies: `cd apps/client && npm install`
      └── Depends on: apps/client/package.json exists
- [x] Install Socket.IO client: `npm install socket.io-client -w apps/client`
      └── Depends on: client deps installed
- [x] Install Socket.IO client types: `npm install @types/socket.io-client -w apps/client --save-dev`
      └── Depends on: socket.io-client installed
- [x] Create `apps/client/src/socket.ts` with Socket.IO client setup

  ```typescript
  import { io } from "socket.io-client";

  const SOCKET_URL = "http://localhost:3000";

  export const socket = io(SOCKET_URL);

  export default socket;
  ```

  └── Depends on: socket.io-client installed

- [x] Update `apps/client/src/App.tsx` with connection status UI

  ```tsx
  import { useEffect, useState } from "react";
  import socket from "./socket";
  import "./App.css";

  function App() {
    const [connected, setConnected] = useState(socket.connected);
    const [roomId, setRoomId] = useState("");
    const [joined, setJoined] = useState(false);

    useEffect(() => {
      socket.on("connect", () => setConnected(true));
      socket.on("disconnect", () => setConnected(false));

      return () => {
        socket.off("connect");
        socket.off("disconnect");
      };
    }, []);

    const handleJoinRoom = () => {
      if (roomId.trim()) {
        socket.emit("join-room", roomId);
        setJoined(true);
      }
    };

    return (
      <div className="app">
        <h1>CubeClash</h1>
        <div className="status">
          Status: {connected ? "Connected ✅" : "Disconnected ❌"}
        </div>
        <div className="room-section">
          <input
            type="text"
            placeholder="Enter room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            disabled={joined}
          />
          <button onClick={handleJoinRoom} disabled={!connected || joined}>
            {joined ? "Joined" : "Join Room"}
          </button>
        </div>
      </div>
    );
  }

  export default App;
  ```

  └── Depends on: socket.ts created

- [x] Test client starts: `npm run dev -w apps/client`
      └── Depends on: App.tsx updated

**Checkpoint:** Client runs on port 5173, shows connection status.

---

## Phase 4: Room Management

> Implement explicit room creation and validated joining.

### 4a: Server Room State

- [x] Create `apps/server/src/types.ts` with Room interface
  ```typescript
  export interface Room {
    id: string;
    hostId: string;
    createdAt: Date;
    participants: string[];
  }
  ```
  └── Depends on: Server setup complete
- [x] Create `apps/server/src/rooms.ts` with room management functions

  ```typescript
  import { Room } from "./types.js";

  const rooms = new Map<string, Room>();

  export function generateRoomId(): string {
    // Generate 6-char alphanumeric ID (e.g., "ABC123")
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  export function createRoom(hostId: string): Room {
    const id = generateRoomId();
    const room: Room = {
      id,
      hostId,
      createdAt: new Date(),
      participants: [hostId],
    };
    rooms.set(id, room);
    return room;
  }

  export function getRoom(roomId: string): Room | undefined {
    return rooms.get(roomId);
  }

  export function roomExists(roomId: string): boolean {
    return rooms.has(roomId);
  }

  export function addParticipant(roomId: string, socketId: string): void {
    const room = rooms.get(roomId);
    if (room && !room.participants.includes(socketId)) {
      room.participants.push(socketId);
    }
  }
  ```

  └── Depends on: types.ts created

- [x] Update `apps/server/src/index.ts` with room events

  ```typescript
  import { createRoom, getRoom, roomExists, addParticipant } from "./rooms.js";

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Create room event
    socket.on("create-room", () => {
      const room = createRoom(socket.id);
      socket.join(room.id);
      console.log(`Room created: ${room.id} by ${socket.id}`);
      socket.emit("room-created", room.id);
    });

    // Join room event with validation
    socket.on("join-room", (roomId: string) => {
      if (!roomExists(roomId)) {
        socket.emit("room-not-found");
        return;
      }

      socket.join(roomId);
      addParticipant(roomId, socket.id);
      console.log(`${socket.id} joined room: ${roomId}`);

      // Notify others in room
      socket.to(roomId).emit("user-joined", socket.id);

      // Acknowledge to joining user
      socket.emit("room-joined", roomId);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      // TODO: Remove from rooms (Phase 2)
    });
  });
  ```

  └── Depends on: rooms.ts created

### 4b: Client UI Updates

- [x] Update `apps/client/src/App.tsx` with Create/Join buttons

  ```tsx
  import { useEffect, useState } from "react";
  import socket from "./socket";
  import "./App.css";

  function App() {
    const [connected, setConnected] = useState(socket.connected);
    const [roomId, setRoomId] = useState("");
    const [joined, setJoined] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [participants, setParticipants] = useState<string[]>([]);
    const [error, setError] = useState("");

    useEffect(() => {
      socket.on("connect", () => setConnected(true));
      socket.on("disconnect", () => setConnected(false));

      socket.on("room-created", (id: string) => {
        setRoomId(id);
        setJoined(true);
        setIsHost(true);
        setError("");
      });

      socket.on("room-joined", (id: string) => {
        setRoomId(id);
        setJoined(true);
        setError("");
      });

      socket.on("room-not-found", () => {
        setError("Room not found. Check the ID and try again.");
      });

      socket.on("user-joined", (socketId: string) => {
        setParticipants((prev) => [...prev, socketId]);
      });

      return () => {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("room-created");
        socket.off("room-joined");
        socket.off("room-not-found");
        socket.off("user-joined");
      };
    }, []);

    const handleCreateRoom = () => {
      socket.emit("create-room");
    };

    const handleJoinRoom = () => {
      if (roomId.trim()) {
        socket.emit("join-room", roomId.toUpperCase());
      }
    };

    if (joined) {
      return (
        <div className="app">
          <h1>CubeClash</h1>
          <div className="room-info">
            <h2>Room: {roomId}</h2>
            <p>{isHost ? "You are the host" : "You joined the room"}</p>
            <h3>Participants ({participants.length + 1}):</h3>
            <ul>
              <li>You ({socket.id.slice(0, 6)})</li>
              {participants.map((p) => (
                <li key={p}>User {p.slice(0, 6)}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    return (
      <div className="app">
        <h1>CubeClash</h1>
        <div className="status">
          Status: {connected ? "Connected ✅" : "Disconnected ❌"}
        </div>

        {error && <div className="error">{error}</div>}

        <div className="room-section">
          <button
            onClick={handleCreateRoom}
            disabled={!connected}
            className="create-btn"
          >
            Create Room
          </button>

          <div className="divider">or</div>

          <div className="join-section">
            <input
              type="text"
              placeholder="Enter room ID (e.g., ABC123)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button
              onClick={handleJoinRoom}
              disabled={!connected || !roomId.trim()}
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  export default App;
  ```

  └── Depends on: Server room events implemented

- [x] Add styling in `apps/client/src/App.css` for room UI
      └── Depends on: App.tsx updated

### 4c: Testing

- [x] Test room creation:
  1. Click "Create Room" → Should show room ID
  2. Room ID should be 6 characters (e.g., "ABC123")
  3. User should see "You are the host"
     └── Depends on: All above complete
- [x] Test room joining:
  1. Create room in Tab 1
  2. Enter room ID in Tab 2, click Join
  3. Both should see 2 participants
     └── Depends on: Room creation works
- [x] Test room not found:
  1. Try to join "NONEXISTENT"
  2. Should see error message
     └── Depends on: Room joining works

**Checkpoint:**

- ✅ Can create room (generates ID)
- ✅ Can join existing room
- ✅ Error shown for non-existent room
- ✅ Participants visible in both tabs

---

## Phase 5: Integration & Testing

> Make sure everything works together.

- [x] Test root dev script: `npm run dev`
  - Should start both client and server
    └── Depends on: All setup complete
- [x] Test room creation flow:
  1. Open http://localhost:5173 in Tab 1
  2. Click "Create Room"
  3. Should see 6-char room ID (e.g., "ABC123")
  4. Server logs should show "Room created"
     └── Depends on: Dev script works
- [x] Test room joining flow:
  1. Open http://localhost:5173 in Tab 2
  2. Enter room ID from Tab 1
  3. Click "Join Room"
  4. Tab 1 should see "user joined" notification
  5. Both should show 2 participants
     └── Depends on: Room creation works
- [x] Test error handling:
  1. Try to join non-existent room (e.g., "ZZZZZZ")
  2. Should see "Room not found" error
  3. Error should clear on successful join
     └── Depends on: Room joining works
- [x] Verify server logs show all events
      └── Depends on: Manual tests complete
- [x] Check CORS working (no browser console errors)
      └── Depends on: Manual tests complete

**Checkpoint:** Full integration test passes.

---

## Completion

- [x] Self-review: Does it match the spec?
  - [x] Two clients can connect ✓
  - [x] Users can create a room (generates unique ID) ✓
  - [x] Users can join an existing room using room ID ✓
  - [x] Joining non-existent room shows error ✓
  - [x] Notifications work (user-joined events) ✓
  - [x] Project structure correct (apps/ directory) ✓
  - [x] Server tracks active rooms ✓
- [x] Run /own:done for 6 Gates + code review + STAR story (2026-02-02)
- [ ] Run /own:retro to capture learnings

## Progress Tracking

| Phase                 | Status      | Started    | Completed  |
| --------------------- | ----------- | ---------- | ---------- |
| Project Structure     | Complete    | 2026-01-XX | 2026-01-XX |
| Server Setup          | Complete    | 2026-01-XX | 2026-01-XX |
| Client Setup          | Complete    | 2026-01-XX | 2026-01-XX |
| Room Management       | Complete    | 2026-01-XX | 2026-01-XX |
| Integration & Testing | Complete    | 2026-01-XX | 2026-02-02 |

---

## Quick Reference

### Key Commands

```bash
# Install all dependencies
npm install

# Run both client and server
npm run dev

# Run just server
npm run dev -w apps/server

# Run just client
npm run dev -w apps/client

# Install package in workspace
npm install <package> -w apps/client
npm install <package> -w apps/server
```

### Key Socket.IO Events

**Room Creation:**

```
Client emits:    'create-room'     → Server
Server emits:    'room-created'    → Client (with room ID)
```

**Room Joining:**

```
Client emits:    'join-room'       → Server (with room ID)
Server emits:    'room-joined'     → Client (success)
Server emits:    'room-not-found'  → Client (error)
Server emits:    'user-joined'     → Room (other clients notified)
```

**Error Handling:**

- Always check for `room-not-found` after emitting `join-room`
- Clear error state on successful `room-created` or `room-joined`

### Ports

- Client: http://localhost:5173
- Server: http://localhost:3000

---

_Remember: YOU write the code. Ask your mentor when stuck._
