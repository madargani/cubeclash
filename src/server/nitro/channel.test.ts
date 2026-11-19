import { describe, expect, it } from 'vitest'

import type { Peer } from 'crossws'

import {
  currentRoomChannel,
  getRoomChannel,
  releaseRoomChannel,
} from './channel'
import type { ServerMessage } from './protocol'

/** A recording fake peer: captures every outbound message. */
function fakePeer(): { peer: Peer; sent: ServerMessage[] } {
  const sent: ServerMessage[] = []
  const peer = {
    request: { url: '', headers: new Headers() },
    send: (data: unknown) => {
      sent.push(JSON.parse(String(data)) as ServerMessage)
    },
    close: () => {},
  } as unknown as Peer
  return { peer, sent }
}

const snapshot: ServerMessage = {
  type: 'roomState',
  id: 'room-1',
  inviteCode: 'abc234',
  host: { userId: 'user-1', displayName: 'Alice' },
  members: [
    { userId: 'user-1', displayName: 'Alice' },
    { userId: 'user-2', displayName: 'Bob' },
  ],
  settings: {
    eventType: '333',
    roundCount: 5,
    inspectionSeconds: 15,
    readyTimeoutSeconds: 30,
  },
  activeBattle: null,
}

describe('room channel', () => {
  it('sends the room snapshot to a peer on open', () => {
    const roomId = crypto.randomUUID()
    const channel = getRoomChannel(roomId)
    const { peer, sent } = fakePeer()

    channel.open(peer, 'user-1', snapshot)

    expect(sent).toEqual([snapshot])
    expect(channel.userIdOf(peer)).toBe('user-1')
    expect(channel.size).toBe(1)
    releaseRoomChannel(roomId)
  })

  it('broadcasts to every connected peer, not just the first', () => {
    const roomId = crypto.randomUUID()
    const channel = getRoomChannel(roomId)
    const alice = fakePeer()
    const bob = fakePeer()
    channel.open(alice.peer, 'user-1', snapshot)
    channel.open(bob.peer, 'user-2', snapshot)

    const message: ServerMessage = { type: 'error', message: 'hello room' }
    channel.broadcast(message)

    expect(alice.sent).toEqual([snapshot, message])
    expect(bob.sent).toEqual([snapshot, message])
    releaseRoomChannel(roomId)
  })

  it('treats two peers of one cuber as independent connections', () => {
    const roomId = crypto.randomUUID()
    const channel = getRoomChannel(roomId)
    const tabOne = fakePeer()
    const tabTwo = fakePeer()
    channel.open(tabOne.peer, 'user-1', snapshot)
    channel.open(tabTwo.peer, 'user-1', snapshot)

    expect(channel.size).toBe(2)
    expect(channel.peersOf('user-1')).toEqual([tabOne.peer, tabTwo.peer])

    // Closing one tab leaves the other connected and still addressed.
    channel.close(tabOne.peer)
    expect(channel.size).toBe(1)
    expect(channel.userIdOf(tabTwo.peer)).toBe('user-1')

    const message: ServerMessage = { type: 'error', message: 'still here' }
    channel.sendToUser('user-1', message)
    expect(tabOne.sent).toHaveLength(1)
    expect(tabTwo.sent).toEqual([snapshot, message])
    releaseRoomChannel(roomId)
  })

  it('drops the channel when its last peer closes', () => {
    const roomId = crypto.randomUUID()
    const channel = getRoomChannel(roomId)
    const { peer } = fakePeer()
    channel.open(peer, 'user-1', snapshot)

    channel.close(peer)
    releaseRoomChannel(roomId)

    expect(currentRoomChannel(roomId)).toBeUndefined()
  })

  it('keeps the channel while any peer remains', () => {
    const roomId = crypto.randomUUID()
    const channel = getRoomChannel(roomId)
    const alice = fakePeer()
    const bob = fakePeer()
    channel.open(alice.peer, 'user-1', snapshot)
    channel.open(bob.peer, 'user-2', snapshot)

    channel.close(alice.peer)
    releaseRoomChannel(roomId)

    expect(currentRoomChannel(roomId)).toBe(channel)
    channel.close(bob.peer)
    releaseRoomChannel(roomId)
  })

  it('does not create a channel when publishing to an empty room', () => {
    const roomId = crypto.randomUUID()
    const channel = getRoomChannel(roomId)
    expect(currentRoomChannel(roomId)).toBe(channel)

    releaseRoomChannel(roomId)
    expect(currentRoomChannel(roomId)).toBeUndefined()
  })
})
