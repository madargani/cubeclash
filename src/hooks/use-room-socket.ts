import { useCallback, useEffect, useRef, useState } from 'react'

import {
  safeParseServerMessage,
  type BattleStateMessage,
  type ClientMessage,
  type RoomStateMessage,
  type RoundResult,
  type Standing,
} from '../server/nitro/protocol'

/** The room domain, exactly as the latest `roomState` snapshot carried it. */
export type RoomClientState = Omit<RoomStateMessage, 'type'>
/** The battle domain, exactly as the latest `battleState` snapshot carried it. */
export type BattleClientState = Omit<BattleStateMessage, 'type'>

export type RoundResultEntry = RoundResult
export type StandingEntry = Standing

export type SocketStatus = 'connecting' | 'open' | 'closed'

/** A capped exponential backoff between reconnect attempts, in milliseconds. */
function backoffMs(attempt: number): number {
  return Math.min(1_000 * 2 ** attempt, 10_000)
}

/**
 * The room page's live channel for its whole lifetime. Every inbound state
 * message is a full snapshot applied by replacement — `roomState` replaces the
 * room domain, `battleState` replaces the battle domain — so there is no merge
 * logic and a reconnect heals by receiving both again. Reconnects back off
 * until unmount.
 */
export function useRoomSocket(roomId: string) {
  const [room, setRoom] = useState<RoomClientState | null>(null)
  const [battle, setBattle] = useState<BattleClientState | null>(null)
  const [status, setStatus] = useState<SocketStatus>('connecting')
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  /** Send now if the channel is open; false means nothing was sent. */
  const send = useCallback((message: ClientMessage): boolean => {
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message))
      return true
    }
    return false
  }, [])

  useEffect(() => {
    let disposed = false
    let retries = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    // The socket this effect instance owns. StrictMode mounts effects twice in
    // development (setup -> cleanup -> setup), so a stale socket's close event
    // can arrive after the second socket is already live; it must never clear
    // the shared ref or schedule a reconnect.
    let activeSocket: WebSocket | null = null

    const connect = () => {
      if (disposed) return
      const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const socket = new WebSocket(
        `${scheme}://${window.location.host}/ws?roomId=${encodeURIComponent(roomId)}`,
      )
      activeSocket = socket
      socketRef.current = socket
      setStatus('connecting')

      socket.onopen = () => {
        if (activeSocket !== socket) return
        retries = 0
        setStatus('open')
      }

      socket.onmessage = (event) => {
        if (activeSocket !== socket) return
        let parsed: unknown
        try {
          parsed = JSON.parse(String(event.data))
        } catch {
          return
        }
        const result = safeParseServerMessage(parsed)
        if (!result.success) return
        const message = result.data

        if (message.type === 'error') {
          setError(message.message)
          return
        }

        setError(null)
        if (message.type === 'roomState') {
          const { type: _type, ...state } = message
          setRoom(state)
          // The battle domain ends when the room no longer has an active
          // battle (or has a different one); the next battleState fills it in.
          setBattle((current) =>
            message.activeBattle && current?.battleId === message.activeBattle.id
              ? current
              : null,
          )
        } else {
          const { type: _type, ...state } = message
          setBattle(state)
        }
      }

      socket.onclose = () => {
        if (activeSocket !== socket) return
        activeSocket = null
        if (socketRef.current === socket) socketRef.current = null
        setStatus('closed')
        if (!disposed) {
          const delay = backoffMs(retries)
          retries += 1
          timer = setTimeout(connect, delay)
        }
      }
    }

    connect()
    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
      const socket = activeSocket
      activeSocket = null
      if (socket) {
        if (socketRef.current === socket) socketRef.current = null
        // 1000 CLOSED_OK: an orderly client-driven close, not an error.
        socket.close(1000)
      }
    }
  }, [roomId])

  return { room, battle, status, error, send }
}
