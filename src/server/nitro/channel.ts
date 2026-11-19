import type { Peer } from 'crossws'

import type { ServerMessage } from './protocol'

/**
 * One live channel per room. It owns connections only — peer-keyed, so two
 * tabs of one cuber are independent — and knows nothing about battle state.
 * The runtime publishes into it; the socket route opens and closes peers.
 *
 * A channel exists while at least one member's room page is open and is
 * dropped when the last connection closes. Live battle state lives in the
 * runtime registry instead.
 */
export class RoomChannel {
  private readonly connections = new Map<Peer, string>()

  constructor(readonly roomId: string) {}

  /** Number of open connections (peers, not cubers). */
  get size(): number {
    return this.connections.size
  }

  /** Register a peer for a cuber and send it the room's current snapshot. */
  open(peer: Peer, userId: string, snapshot: ServerMessage): void {
    this.connections.set(peer, userId)
    this.send(peer, snapshot)
  }

  /** Drop a peer; the cuber's other tabs stay connected. */
  close(peer: Peer): void {
    this.connections.delete(peer)
  }

  /** The cuber a peer belongs to, if it is still connected. */
  userIdOf(peer: Peer): string | null {
    return this.connections.get(peer) ?? null
  }

  /** Every connection belonging to one cuber. */
  peersOf(userId: string): Peer[] {
    const peers: Peer[] = []
    for (const [peer, peerUserId] of this.connections) {
      if (peerUserId === userId) peers.push(peer)
    }
    return peers
  }

  /** Send one message to one connection. */
  send(peer: Peer, message: ServerMessage): void {
    sendRaw(peer, message)
  }

  /** Send one message to every connection of one cuber (all their tabs). */
  sendToUser(userId: string, message: ServerMessage): void {
    for (const peer of this.peersOf(userId)) {
      sendRaw(peer, message)
    }
  }

  /** Send one message to every connection in the room. */
  broadcast(message: ServerMessage): void {
    for (const peer of this.connections.keys()) {
      sendRaw(peer, message)
    }
  }
}

/** The process-wide channel registry, one entry per room with open pages. */
const channels = new Map<string, RoomChannel>()

/** The room's channel, creating it if this is the first connection. */
export function getRoomChannel(roomId: string): RoomChannel {
  let channel = channels.get(roomId)
  if (!channel) {
    channel = new RoomChannel(roomId)
    channels.set(roomId, channel)
  }
  return channel
}

/** The room's channel if one is open; never creates one. */
export function currentRoomChannel(roomId: string): RoomChannel | undefined {
  return channels.get(roomId)
}

/** Drop the channel once its last connection closes. */
export function releaseRoomChannel(roomId: string): void {
  const channel = channels.get(roomId)
  if (channel && channel.size === 0) {
    channels.delete(roomId)
  }
}

/** Publish a message to a room without creating a channel for an empty room. */
export function publishToRoom(roomId: string, message: ServerMessage): void {
  currentRoomChannel(roomId)?.broadcast(message)
}

function sendRaw(peer: Peer, message: ServerMessage): void {
  try {
    peer.send(JSON.stringify(message))
  } catch {
    // A single failed send must not break a broadcast to the rest.
  }
}
