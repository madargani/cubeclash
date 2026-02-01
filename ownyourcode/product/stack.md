# Technology Stack

## Detected/Chosen Stack

| Layer | Technology | Version | Source | Purpose |
|-------|------------|---------|--------|---------|
| Frontend | React | 19.2.4 | MCP verified (2026-01-31) | UI framework for timing interface |
| Build Tool | Vite | 7.3.1 | MCP verified (2026-01-31) | Fast dev server & production builds |
| Language | TypeScript | 5.9.3 | MCP verified (2026-01-31) | Type safety across frontend & backend |
| Backend | Express.js | 5.2.1 | MCP verified (2026-01-31) | HTTP server & API routes |
| Runtime | Node.js | 18+ | Express requirement | JavaScript runtime environment |
| Real-time | Socket.IO | 4.8.3 | MCP verified (2026-01-31) | WebSocket communication for live races |
| Styling | (TBD) | — | Choose based on preference | UI styling solution |

**Source Legend:**
- `MCP verified (YYYY-MM-DD)` — Confirmed via Context7 + npm registry on this date
- `—` — To be determined during development

## Package Manager

**Using:** npm

npm comes bundled with Node.js — always available out of the box. It's the universal default that every JavaScript developer knows. While not the fastest, it has the largest ecosystem and community support.

## Why These Choices?

This stack is optimized for real-time multiplayer competition:

- **Socket.IO** — Perfect for this use case. Provides:
  - Bidirectional event-based communication
  - Automatic fallback to HTTP long-polling if WebSockets fail
  - Room/namespaces support for competition rooms
  - Broadcasting to all clients in a room
  - Built-in reconnection handling

- **React + Vite** — Fast development and optimal production builds:
  - Vite's HMR makes UI iteration rapid
  - React's component model fits the timer UI well
  - TypeScript ensures type safety across client/server

- **Express 5** — Modern, stable, minimalist:
  - Version 5.x brings better async/await support
  - Node.js 18+ requirement aligns with modern practices
  - Excellent middleware ecosystem

## Version Notes

All versions verified current as of January 31, 2026. These are the latest stable releases available on npm.

⚠️ **Socket.IO 4.8.3** is the current stable. Version 5 is in development with protocol changes — stick with 4.x for production stability.

## Key Files (To Be Created)

| File | Purpose |
|------|---------|
| `package.json` | Root workspace with client/server scripts |
| `client/vite.config.ts` | Vite configuration for React + TypeScript |
| `client/tsconfig.json` | TypeScript config for frontend |
| `server/src/index.ts` | Express + Socket.IO server entry |
| `server/tsconfig.json` | TypeScript config for backend |

## Version Freshness

⚠️ **Generated**: 2026-01-31

Technology versions change frequently. If this document is more than 30 days old, re-run `/own:init` or check the official documentation:
- React: https://react.dev/
- Vite: https://vite.dev/
- TypeScript: https://www.typescriptlang.org/
- Express: https://expressjs.com/
- Socket.IO: https://socket.io/
