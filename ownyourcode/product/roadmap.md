# Project Roadmap

## Current Status

**New project** — Empty workspace. OwnYourCode initialized with mission defined and stack selected. Ready to begin Phase 1.

## Phase 1: Foundation

Priority: HIGH

- [ ] Project structure setup (client/ + server/ directories)
- [ ] Initialize npm workspace with package.json
- [ ] Set up Vite + React + TypeScript in client/
- [ ] Set up Express + Socket.IO + TypeScript in server/
- [ ] Configure TypeScript for both frontend and backend
- [ ] Establish Socket.IO connection (client ↔ server)
- [ ] Basic room creation and joining (Socket.IO rooms)
- [ ] Test: Two clients can connect and join same room

## Phase 2: Core Features

Priority: MEDIUM

- [ ] Implement scramble generation (WCA-compliant algorithms)
- [ ] Synchronized scramble distribution to all room members
- [ ] Build cstimer-like timing UI (inspection timer, solve timer)
- [ ] Record solve times and submit to server
- [ ] Live leaderboard updates after each solve
- [ ] Round management (start race, end race, next round)
- [ ] Handle connection/disconnection gracefully
- [ ] Basic user identification (nickname/room)

## Phase 3: Polish & Deploy

Priority: LOW

- [ ] Add styling/theme (competition feel)
- [ ] Penalty management (+2, DNF)
- [ ] Room settings (cube type, round count, time limit)
- [ ] Results history / session summary
- [ ] Testing (unit tests for scrambles, integration tests for races)
- [ ] Documentation (README, API docs)
- [ ] Deployment setup (Render/Railway for backend, Vercel/Netlify for frontend)
