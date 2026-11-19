import { definePlugin } from 'nitro'
import { setWebSocketHooks } from 'crossws'

import hooks from '../websocket'

/**
 * Nitro plugin that registers the realtime battle WebSocket hooks (defined in
 * `../websocket.ts`) for every WebSocket upgrade. Required because this nitro
 * release does not auto-import `serverDir/websocket.ts`.
 */
export default definePlugin((nitro) => {
  nitro.hooks.hook('request', (event) => {
    if (event.req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      setWebSocketHooks(event.req, hooks)
    }
  })
})
