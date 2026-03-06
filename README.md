# CubeClash

A virtual speedcube competition platform. Compete with friends in synchronized speedcubing races with live timing, scrambles, and results.

**Live Demo**: [https://cubeclash.vercel.app](https://cubeclash.vercel.app) _(replace with your actual URL)_

## Tech Stack

| Layer         | Technology                                                  |
| ------------- | ----------------------------------------------------------- |
| **Frontend**  | React 19, React Router 7, Zustand, Tailwind CSS 4, Radix UI |
| **Real-time** | Socket.io                                                   |
| **Backend**   | Express, Socket.io Server                                   |
| **Types**     | Shared TypeScript package                                   |
| **Build**     | Vite, TypeScript                                            |

## Project Structure

```
cubeclash/
├── apps/
│   ├── client/          # React frontend (Vite)
│   └── server/          # Express + Socket.io backend
├── packages/
│   └── types/           # Shared TypeScript types
├── package.json         # Monorepo workspace config
└── README.md           # This file
```

## Getting Started

```bash
# Install dependencies
npm install

# Start both client and server
npm run dev
```

- Client runs at `http://localhost:5173`
- Server runs at `http://localhost:3000`
